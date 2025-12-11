/**
 * PresenceIndicator Component
 *
 * Shows active users and their current status/activity
 * Displays in dashboard header for awareness
 */

import { useState, useEffect } from "react";
import { useRealtime, ActiveUser } from "../hooks/useRealtime";
import {
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

export default function PresenceIndicator() {
  const { isConnected, activeUsers } = useRealtime();
  const [showDetails, setShowDetails] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    // Filter out current user from display (handled by server)
    setFilteredUsers(activeUsers);
  }, [activeUsers]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "idle":
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case "offline":
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "idle":
        return "bg-yellow-100 text-yellow-800";
      case "offline":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="relative">
      {/* Connection Status Indicator */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-lg transition"
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Online Indicator */}
        <div className="relative">
          <UserGroupIcon className="w-5 h-5 text-gray-600" />
          <div
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
        </div>

        {/* User Count */}
        <span className="text-sm font-medium text-gray-700">
          {filteredUsers.length} online
        </span>

        {/* Connection Status */}
        <div className="hidden sm:block">
          {isConnected ? (
            <span className="text-xs text-green-600">Connected</span>
          ) : (
            <span className="text-xs text-red-600">Disconnected</span>
          )}
        </div>
      </div>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Active Users</h3>
            <p className="text-xs text-gray-500 mt-1">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} online
            </p>
          </div>

          {/* User List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <li
                    key={user.userId}
                    className="px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Status Icon */}
                        {getStatusIcon(user.status)}

                        {/* User Info */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.username}
                          </p>
                          {user.connectedDevices > 1 && (
                            <p className="text-xs text-gray-500">
                              {user.connectedDevices} devices
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${getStatusColor(
                          user.status
                        )}`}
                      >
                        {user.status}
                      </span>
                    </div>

                    {/* Current Action */}
                    {user.currentAction && (
                      <p className="text-xs text-gray-500 mt-1 pl-6">
                        {user.currentAction}
                      </p>
                    )}

                    {/* Last Seen */}
                    {user.status === "offline" && (
                      <p className="text-xs text-gray-400 mt-1 pl-6">
                        Last seen{" "}
                        {new Date(user.lastSeen).toLocaleTimeString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <p className="text-sm">No other users online</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600">
              Connection:{" "}
              <span className={isConnected ? "text-green-600" : "text-red-600"}>
                {isConnected ? "✓ Active" : "✗ Disconnected"}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Overlay to close details */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}
