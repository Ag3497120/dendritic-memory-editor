/**
 * Load Balancing & Clustering
 *
 * Distributed request handling:
 * - Multiple load balancing strategies
 * - Health check monitoring
 * - Server node management
 * - Request distribution algorithms
 * - Session affinity (sticky sessions)
 */

import { v4 as uuidv4 } from "uuid";

export type LoadBalancingStrategy =
  | "round-robin"
  | "least-connections"
  | "weighted"
  | "ip-hash"
  | "random";

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "maintenance";

export interface ServerNode {
  id: string;
  host: string;
  port: number;
  weight: number;
  status: HealthStatus;
  activeConnections: number;
  maxConnections: number;
  lastHealthCheck: number;
  uptime: number;
  responseTime: number;
  errorRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
  requestsHandled: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  endpoint: string;
}

export interface LoadBalancerStats {
  totalRequests: number;
  totalConnections: number;
  activeConnections: number;
  averageResponseTime: number;
  errorRate: number;
  healthyNodes: number;
  unhealthyNodes: number;
  clusterHealth: number; // 0-100%
}

export interface SessionAffinity {
  sessionId: string;
  nodeId: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
}

/**
 * Load Balancing & Clustering Engine
 */
export class LoadBalancingEngine {
  private nodes: Map<string, ServerNode> = new Map();
  private roundRobinIndex: number = 0;
  private sessionAffinities: Map<string, SessionAffinity> = new Map();
  private healthCheckConfigs: Map<string, HealthCheckConfig> = new Map();
  private requestLog: Array<{
    nodeId: string;
    timestamp: number;
    responseTime: number;
    status: number;
  }> = [];
  private strategy: LoadBalancingStrategy = "round-robin";
  private maxRequestLogSize: number = 10000;

  constructor(strategy: LoadBalancingStrategy = "round-robin") {
    this.strategy = strategy;
  }

  /**
   * Register server node
   */
  registerNode(
    host: string,
    port: number,
    weight: number = 1,
    maxConnections: number = 1000
  ): ServerNode {
    const nodeId = `node-${uuidv4()}`;

    const node: ServerNode = {
      id: nodeId,
      host,
      port,
      weight,
      status: "healthy",
      activeConnections: 0,
      maxConnections,
      lastHealthCheck: Date.now(),
      uptime: 0,
      responseTime: 0,
      errorRate: 0,
      requestsHandled: 0,
    };

    this.nodes.set(nodeId, node);

    // Initialize health check config
    this.healthCheckConfigs.set(nodeId, {
      enabled: true,
      interval: 10000,
      timeout: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      endpoint: "/health",
    });

    return node;
  }

  /**
   * Deregister server node
   */
  deregisterNode(nodeId: string): boolean {
    return this.nodes.delete(nodeId);
  }

  /**
   * Get next node for request
   */
  selectNode(clientIp?: string): ServerNode | null {
    const healthyNodes = Array.from(this.nodes.values()).filter(
      (n) => n.status === "healthy" || n.status === "degraded"
    );

    if (healthyNodes.length === 0) return null;

    let selectedNode: ServerNode | null = null;

    switch (this.strategy) {
      case "round-robin":
        selectedNode = this.selectRoundRobin(healthyNodes);
        break;

      case "least-connections":
        selectedNode = this.selectLeastConnections(healthyNodes);
        break;

      case "weighted":
        selectedNode = this.selectWeighted(healthyNodes);
        break;

      case "ip-hash":
        selectedNode = this.selectIpHash(healthyNodes, clientIp || "");
        break;

      case "random":
        selectedNode = this.selectRandom(healthyNodes);
        break;

      default:
        selectedNode = healthyNodes[0];
    }

    if (selectedNode) {
      selectedNode.activeConnections++;
    }

    return selectedNode;
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(nodes: ServerNode[]): ServerNode {
    const node = nodes[this.roundRobinIndex % nodes.length];
    this.roundRobinIndex++;
    return node;
  }

  /**
   * Least connections selection
   */
  private selectLeastConnections(nodes: ServerNode[]): ServerNode {
    return nodes.reduce((min, node) =>
      node.activeConnections < min.activeConnections ? node : min
    );
  }

  /**
   * Weighted selection (weighted round-robin)
   */
  private selectWeighted(nodes: ServerNode[]): ServerNode {
    const totalWeight = nodes.reduce((sum, n) => sum + n.weight, 0);
    let random = Math.random() * totalWeight;

    for (const node of nodes) {
      random -= node.weight;
      if (random <= 0) return node;
    }

    return nodes[0];
  }

  /**
   * IP hash selection (for session affinity)
   */
  private selectIpHash(nodes: ServerNode[], clientIp: string): ServerNode {
    let hash = 0;
    for (let i = 0; i < clientIp.length; i++) {
      hash = (hash << 5) - hash + clientIp.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    return nodes[Math.abs(hash) % nodes.length];
  }

  /**
   * Random selection
   */
  private selectRandom(nodes: ServerNode[]): ServerNode {
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  /**
   * Record request
   */
  recordRequest(nodeId: string, responseTime: number, status: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Update node metrics
    node.activeConnections = Math.max(0, node.activeConnections - 1);
    node.responseTime =
      (node.responseTime * 0.8 + responseTime * 0.2); // Moving average
    node.requestsHandled++;

    // Update error rate
    const isError = status >= 400;
    node.errorRate =
      (node.errorRate * 0.9 + (isError ? 1 : 0) * 0.1); // Moving average

    // Log request
    this.requestLog.push({
      nodeId,
      timestamp: Date.now(),
      responseTime,
      status,
    });

    // Maintain max log size
    if (this.requestLog.length > this.maxRequestLogSize) {
      this.requestLog.shift();
    }
  }

  /**
   * Update node health status
   */
  updateNodeHealth(
    nodeId: string,
    status: HealthStatus,
    metrics?: {
      cpuUsage?: number;
      memoryUsage?: number;
      uptime?: number;
    }
  ): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.status = status;
    node.lastHealthCheck = Date.now();

    if (metrics) {
      if (metrics.cpuUsage !== undefined) node.cpuUsage = metrics.cpuUsage;
      if (metrics.memoryUsage !== undefined)
        node.memoryUsage = metrics.memoryUsage;
      if (metrics.uptime !== undefined) node.uptime = metrics.uptime;
    }
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): ServerNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): ServerNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get healthy nodes count
   */
  getHealthyNodeCount(): number {
    return Array.from(this.nodes.values()).filter(
      (n) => n.status === "healthy"
    ).length;
  }

  /**
   * Get cluster statistics
   */
  getClusterStats(): LoadBalancerStats {
    const allNodes = Array.from(this.nodes.values());
    const healthyNodes = allNodes.filter((n) => n.status === "healthy");
    const unhealthyNodes = allNodes.filter((n) => n.status === "unhealthy");

    const totalRequests = allNodes.reduce((sum, n) => sum + n.requestsHandled, 0);
    const totalConnections = allNodes.reduce((sum, n) => sum + n.activeConnections, 0);
    const avgResponseTime =
      allNodes.length > 0
        ? allNodes.reduce((sum, n) => sum + n.responseTime, 0) / allNodes.length
        : 0;
    const avgErrorRate =
      allNodes.length > 0
        ? allNodes.reduce((sum, n) => sum + n.errorRate, 0) / allNodes.length
        : 0;

    const clusterHealth = allNodes.length > 0
      ? (healthyNodes.length / allNodes.length) * 100
      : 0;

    return {
      totalRequests,
      totalConnections,
      activeConnections: totalConnections,
      averageResponseTime: avgResponseTime,
      errorRate: avgErrorRate,
      healthyNodes: healthyNodes.length,
      unhealthyNodes: unhealthyNodes.length,
      clusterHealth,
    };
  }

  /**
   * Get node statistics
   */
  getNodeStats(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const nodeRequests = this.requestLog.filter((r) => r.nodeId === nodeId);
    const last100 = nodeRequests.slice(-100);

    const avgResponseTime =
      last100.length > 0
        ? last100.reduce((sum, r) => sum + r.responseTime, 0) / last100.length
        : 0;

    const errorCount = last100.filter((r) => r.status >= 400).length;
    const errorRate = last100.length > 0 ? (errorCount / last100.length) * 100 : 0;

    return {
      nodeId,
      host: node.host,
      port: node.port,
      status: node.status,
      activeConnections: node.activeConnections,
      requestsHandled: node.requestsHandled,
      averageResponseTime: avgResponseTime,
      errorRate,
      cpuUsage: node.cpuUsage,
      memoryUsage: node.memoryUsage,
      uptime: node.uptime,
    };
  }

  /**
   * Set session affinity
   */
  setSessionAffinity(sessionId: string, nodeId: string, ttlSeconds: number = 3600): void {
    const affinity: SessionAffinity = {
      sessionId,
      nodeId,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    };

    this.sessionAffinities.set(sessionId, affinity);
  }

  /**
   * Get session affinity
   */
  getSessionAffinity(sessionId: string): ServerNode | null {
    const affinity = this.sessionAffinities.get(sessionId);

    if (!affinity) return null;

    // Check expiration
    if (affinity.expiresAt < Date.now()) {
      this.sessionAffinities.delete(sessionId);
      return null;
    }

    // Update last accessed
    affinity.lastAccessedAt = Date.now();

    const node = this.nodes.get(affinity.nodeId);
    return node || null;
  }

  /**
   * Change load balancing strategy
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.roundRobinIndex = 0;
  }

  /**
   * Get current strategy
   */
  getStrategy(): LoadBalancingStrategy {
    return this.strategy;
  }

  /**
   * Simulate node failure
   */
  simulateNodeFailure(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = "unhealthy";
      node.activeConnections = 0;
    }
  }

  /**
   * Recover node
   */
  recoverNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = "healthy";
      node.errorRate = 0;
    }
  }

  /**
   * Get load distribution (for visualization)
   */
  getLoadDistribution(): Array<{
    nodeId: string;
    host: string;
    connections: number;
    requests: number;
  }> {
    return Array.from(this.nodes.values()).map((node) => ({
      nodeId: node.id,
      host: `${node.host}:${node.port}`,
      connections: node.activeConnections,
      requests: node.requestsHandled,
    }));
  }

  /**
   * Get nodes needing attention
   */
  getProblematicNodes(): ServerNode[] {
    return Array.from(this.nodes.values()).filter((n) => {
      // Nodes with high error rate or unhealthy status
      return n.status !== "healthy" || n.errorRate > 0.1;
    });
  }

  /**
   * Clean up expired session affinities
   */
  cleanupExpiredSessions(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [sessionId, affinity] of this.sessionAffinities) {
      if (affinity.expiresAt < now) {
        this.sessionAffinities.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get balancing efficiency
   */
  getBalancingEfficiency(): {
    uniformity: number; // 0-100%, how evenly load is distributed
    utilizationRatio: number; // active vs max connections
    imbalanceFactor: number; // 0-1, lower is better
  } {
    const nodes = Array.from(this.nodes.values());
    if (nodes.length === 0) {
      return { uniformity: 0, utilizationRatio: 0, imbalanceFactor: 0 };
    }

    const loads = nodes.map((n) => n.activeConnections);
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance =
      loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) /
      loads.length;
    const stdDev = Math.sqrt(variance);

    // Uniformity: higher is better (lower std dev = more uniform)
    const uniformity = Math.max(
      0,
      100 - (stdDev / (avgLoad || 1)) * 100
    );

    // Utilization ratio
    const totalActive = loads.reduce((a, b) => a + b, 0);
    const totalCapacity = nodes.reduce((sum, n) => sum + n.maxConnections, 0);
    const utilizationRatio = (totalActive / totalCapacity) * 100;

    // Imbalance factor: max load vs average load (0-1 scale)
    const maxLoad = Math.max(...loads);
    const imbalanceFactor = avgLoad > 0 ? (maxLoad - avgLoad) / avgLoad : 0;

    return {
      uniformity: Math.min(100, Math.max(0, uniformity)),
      utilizationRatio: Math.min(100, utilizationRatio),
      imbalanceFactor: Math.min(1, imbalanceFactor),
    };
  }
}

/**
 * Singleton instance
 */
let loadBalancingEngine: LoadBalancingEngine | null = null;

export function getLoadBalancingEngine(
  strategy?: LoadBalancingStrategy
): LoadBalancingEngine {
  if (!loadBalancingEngine) {
    loadBalancingEngine = new LoadBalancingEngine(strategy);
  }
  return loadBalancingEngine;
}

export function resetLoadBalancingEngine(): void {
  loadBalancingEngine = null;
}
