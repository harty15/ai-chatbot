'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Zap, 
  RefreshCw, 
  Settings, 
  Activity,
  Server,
  Play,
  Square,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionsProps {
  onAddServer: () => void;
  onRefreshAll: () => void;
  onConnectAll: () => void;
  onDisconnectAll: () => void;
  servers: any[];
  loading?: boolean;
}

export function MCPFloatingActions({
  onAddServer,
  onRefreshAll,
  onConnectAll,
  onDisconnectAll,
  servers,
  loading = false
}: FloatingActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const connectedCount = servers.filter(s => s.connectionState?.status === 'connected').length;
  const disconnectedCount = servers.length - connectedCount;

  const actions = [
    {
      id: 'add',
      icon: Plus,
      label: 'Add Server',
      action: onAddServer,
      color: 'bg-blue-600 hover:bg-blue-700',
      shortcut: '⌘+N'
    },
    {
      id: 'refresh',
      icon: RefreshCw,
      label: 'Refresh All',
      action: onRefreshAll,
      color: 'bg-green-600 hover:bg-green-700',
      shortcut: '⌘+R'
    },
    {
      id: 'connect',
      icon: Play,
      label: `Connect All (${disconnectedCount})`,
      action: onConnectAll,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      disabled: disconnectedCount === 0
    },
    {
      id: 'disconnect',
      icon: Square,
      label: `Disconnect All (${connectedCount})`,
      action: onDisconnectAll,
      color: 'bg-orange-600 hover:bg-orange-700',
      disabled: connectedCount === 0
    }
  ];

  const mainButtonVariants = {
    idle: { 
      scale: 1,
      rotate: 0,
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
    },
    hover: { 
      scale: 1.1,
      rotate: 180,
      background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    tap: { 
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    }
  };

  const menuVariants = {
    closed: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      transition: {
        duration: 0.2,
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    closed: {
      opacity: 0,
      scale: 0.3,
      y: 20,
      x: 20,
      transition: {
        duration: 0.2
      }
    },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.3,
        type: 'spring',
        stiffness: 200,
        damping: 20
      }
    }
  };

  const pulseVariants = {
    pulse: {
      boxShadow: [
        '0 0 0 0 rgba(59, 130, 246, 0.7)',
        '0 0 0 10px rgba(59, 130, 246, 0)',
        '0 0 0 0 rgba(59, 130, 246, 0)'
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeOut'
      }
    }
  };

  const handleActionClick = async (action: any) => {
    setActiveAction(action.id);
    setIsExpanded(false);
    
    try {
      await action.action();
      
      // Show success feedback
      setTimeout(() => {
        setActiveAction(null);
      }, 1000);
    } catch (error) {
      setActiveAction(null);
      console.error('Action failed:', error);
    }
  };

  const getStatusSummary = () => {
    if (servers.length === 0) return 'No servers';
    if (connectedCount === servers.length) return 'All connected';
    if (connectedCount === 0) return 'All disconnected';
    return `${connectedCount}/${servers.length} connected`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Background overlay when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Action menu */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="absolute bottom-16 right-0 flex flex-col space-y-3"
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              const isActive = activeAction === action.id;
              
              return (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      variants={itemVariants}
                      whileHover={{ scale: 1.1, x: -5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={() => handleActionClick(action)}
                        disabled={action.disabled || loading}
                        className={cn(
                          "h-12 px-4 shadow-lg border-0 text-white font-medium",
                          action.color,
                          action.disabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <motion.div
                          animate={isActive ? {
                            rotate: 360,
                            scale: [1, 1.2, 1]
                          } : {}}
                          transition={{
                            duration: 0.6,
                            ease: 'easeInOut'
                          }}
                          className="flex items-center space-x-2"
                        >
                          {isActive ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                          <span>{action.label}</span>
                        </motion.div>
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="flex items-center space-x-2">
                    <span>{action.label}</span>
                    {action.shortcut && (
                      <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {action.shortcut}
                      </kbd>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            variants={mainButtonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            animate={loading ? 'pulse' : 'idle'}
            className="relative"
          >
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "h-14 w-14 rounded-full shadow-2xl border-0 text-white",
                "bg-gradient-to-r from-blue-600 to-blue-700",
                "hover:from-blue-700 hover:to-blue-800"
              )}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, rotate: -180 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 180 }}
                  >
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </motion.div>
                ) : isExpanded ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                  >
                    <MoreHorizontal className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <Zap className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* Status indicator */}
            <motion.div
              className="absolute -top-2 -right-2 flex items-center space-x-1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 border-white shadow-lg",
                connectedCount === servers.length && servers.length > 0
                  ? "bg-green-500"
                  : connectedCount > 0
                  ? "bg-yellow-500"
                  : "bg-red-500"
              )}>
                {loading && (
                  <motion.div
                    variants={pulseVariants}
                    animate="pulse"
                    className="w-full h-full rounded-full"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left" className="flex flex-col items-start space-y-1">
          <span className="font-medium">MCP Quick Actions</span>
          <span className="text-xs text-muted-foreground">
            {getStatusSummary()}
          </span>
          <span className="text-xs text-muted-foreground">
            Click to expand actions
          </span>
        </TooltipContent>
      </Tooltip>

      {/* Connection pulse animation */}
      <AnimatePresence>
        {servers.some(s => s.connectionState?.status === 'connecting') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute inset-0 rounded-full bg-blue-400/20 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick stats overlay that appears on hover
export function MCPQuickStats({ servers }: { servers: any[] }) {
  const connectedCount = servers.filter(s => s.connectionState?.status === 'connected').length;
  const totalTools = servers.reduce((acc, s) => acc + (s.availableTools?.length || 0), 0);
  const totalExecutions = servers.reduce((acc, s) => acc + (s.executionCount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-20 right-0 bg-white rounded-lg shadow-xl border p-4 min-w-48"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quick Stats</span>
          <Activity className="w-4 h-4 text-blue-600" />
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{connectedCount}/{servers.length}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Zap className="w-3 h-3 text-yellow-600" />
            <span>{totalTools}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Server className="w-3 h-3 text-blue-600" />
            <span>{servers.length}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Activity className="w-3 h-3 text-purple-600" />
            <span>{totalExecutions}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}