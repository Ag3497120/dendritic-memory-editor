/**
 * MCP Dashboard Page
 *
 * Central hub for MCP server features:
 * - Advanced knowledge search
 * - AI reasoning and inference
 * - Version history and tile management
 */

import { useState, useEffect } from "react";
import MCPSearchPanel from "../components/MCPSearchPanel";
import MCPInferencePanel from "../components/MCPInferencePanel";
import InferenceHistory from "../components/InferenceHistory";
import PresenceIndicator from "../components/PresenceIndicator";
import { useMCP } from "../hooks/useMCP";
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

type TabType = "search" | "inference" | "history" | "advanced" | "stats";

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: "search",
    label: "Search",
    icon: <MagnifyingGlassIcon className="w-5 h-5" />,
    description: "Search knowledge across all domains",
  },
  {
    id: "inference",
    label: "Reasoning",
    icon: <SparklesIcon className="w-5 h-5" />,
    description: "Get AI-powered reasoning and analysis",
  },
  {
    id: "history",
    label: "Saved Inferences",
    icon: <DocumentCheckIcon className="w-5 h-5" />,
    description: "View saved inference results",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: <AdjustmentsHorizontalIcon className="w-5 h-5" />,
    description: "Advanced features and management",
  },
  {
    id: "stats",
    label: "Statistics",
    icon: <DocumentTextIcon className="w-5 h-5" />,
    description: "View knowledge base statistics",
  },
];

export default function MCPDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [mcpHealth, setMcpHealth] = useState<boolean | null>(null);
  const [mcpInfo, setMcpInfo] = useState<any>(null);

  const { checkHealth, getInfo } = useMCP();

  useEffect(() => {
    // Check MCP server health on component mount
    const checkMCPHealth = async () => {
      const isHealthy = await checkHealth();
      setMcpHealth(isHealthy);

      if (isHealthy) {
        const info = await getInfo();
        setMcpInfo(info);
      }
    };

    checkMCPHealth();
  }, [checkHealth, getInfo]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <SparklesIcon className="w-8 h-8 text-purple-500" />
                MCP Knowledge Hub
              </h1>
              <p className="text-gray-600 mt-1">
                Powered by project_locate inference engine
              </p>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-6">
              {/* Presence Indicator */}
              <PresenceIndicator />

              {/* MCP Health Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    mcpHealth ? "bg-green-500" : "bg-red-500"
                  } animate-pulse`}
                />
                <span className="text-sm font-semibold text-gray-700">
                  {mcpHealth ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-9">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto py-8">
        {!mcpHealth && (
          <div className="mx-4 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-semibold">
              ⚠️ MCP Server Not Available
            </p>
            <p className="text-yellow-700 text-sm mt-1">
              Make sure the project_locate MCP server is running:
              <code className="block mt-1 bg-yellow-100 px-2 py-1 rounded text-xs font-mono">
                python -m mcp.server
              </code>
            </p>
          </div>
        )}

        {activeTab === "search" && <MCPSearchPanel />}

        {activeTab === "inference" && <MCPInferencePanel />}

        {activeTab === "history" && <InferenceHistory />}

        {activeTab === "advanced" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Advanced Features
              </h2>

              <div className="space-y-6">
                {/* Batch Export */}
                <div className="border-l-4 border-purple-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Batch Export to .iath
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Export multiple tiles to .iath v3 format with version history
                  </p>
                  <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition">
                    Select Tiles to Export
                  </button>
                </div>

                {/* Batch Import */}
                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Import from .iath
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Import tiles from .iath files with merge strategies
                  </p>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
                    Import .iath File
                  </button>
                </div>

                {/* Version Management */}
                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Version Management
                  </h3>
                  <p className="text-gray-600 mb-4">
                    View and manage tile version history with changelog tracking
                  </p>
                  <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
                    Browse Versions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Knowledge Base Statistics
              </h2>

              {mcpInfo && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">MCP Server Status</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {mcpInfo.name} v{mcpInfo.version}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Available Endpoints</p>
                    <ul className="text-sm text-gray-900 mt-2 space-y-1 font-mono">
                      {mcpInfo.mcp_endpoints
                        ?.slice(0, 5)
                        .map((endpoint: string, idx: number) => (
                          <li key={idx}>• {endpoint}</li>
                        ))}
                      {mcpInfo.mcp_endpoints?.length > 5 && (
                        <li>... and {mcpInfo.mcp_endpoints.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <button className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
                Refresh Statistics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
