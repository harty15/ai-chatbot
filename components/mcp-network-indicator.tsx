'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Zap, 
  ArrowUp,
  ArrowDown,
  Signal,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkIndicatorProps {
  servers: any[];
  className?: string;
}

export function MCPNetworkIndicator({ servers, className }: NetworkIndicatorProps) {
  const [networkActivity, setNetworkActivity] = useState<Array<{
    id: string;
    type: 'upload' | 'download';
    timestamp: number;
  }>>([]);

  const connectedCount = servers.filter(s => s.connectionState?.status === 'connected').length;
  const totalServers = servers.length;
  const connectingCount = servers.filter(s => s.connectionState?.status === 'connecting').length;

  // Simulate network activity for demo
  useEffect(() => {
    if (connectedCount === 0) return;

    const interval = setInterval(() => {
      // Randomly add network activity
      if (Math.random() > 0.7) {
        const activity = {
          id: Math.random().toString(36).substr(2, 9),
          type: Math.random() > 0.5 ? 'upload' : 'download' as const,
          timestamp: Date.now()
        };
        
        setNetworkActivity(prev => [...prev.slice(-4), activity]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connectedCount]);

  // Clean up old activity
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setNetworkActivity(prev => 
        prev.filter(activity => now - activity.timestamp < 5000)
      );
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  const getSignalStrength = () => {
    if (totalServers === 0) return 0;
    const ratio = connectedCount / totalServers;
    if (ratio >= 0.8) return 4;
    if (ratio >= 0.6) return 3;
    if (ratio >= 0.4) return 2;
    if (ratio > 0) return 1;
    return 0;
  };

  const signalStrength = getSignalStrength();

  const indicatorVariants = {
    connected: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    connecting: {
      rotate: 360,
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear'
      }
    },
    disconnected: {
      scale: 1,
      rotate: 0
    }
  };

  const waveVariants = {
    active: {
      scale: [1, 1.5, 2],
      opacity: [0.8, 0.4, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeOut'
      }
    }
  };

  const activityVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: [0, 1.2, 1],
      opacity: [0, 1, 0.8],
      y: [0, -20, -40],
      transition: {
        duration: 1,
        ease: 'easeOut'
      }
    },
    exit: { 
      scale: 0,
      opacity: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className={cn("relative flex items-center space-x-3", className)}>
      {/* Main network indicator */}
      <div className="relative">
        <motion.div
          variants={indicatorVariants}
          animate={
            connectingCount > 0 ? 'connecting' :
            connectedCount > 0 ? 'connected' : 'disconnected'
          }
          className={cn(
            "relative z-10 p-2 rounded-full border-2",
            connectedCount === totalServers && totalServers > 0
              ? "bg-green-50 border-green-200 text-green-600"
              : connectedCount > 0
              ? "bg-yellow-50 border-yellow-200 text-yellow-600"
              : connectingCount > 0
              ? "bg-blue-50 border-blue-200 text-blue-600"
              : "bg-gray-50 border-gray-200 text-gray-400"
          )}
        >
          {connectingCount > 0 ? (
            <Loader2 className="w-4 h-4" />
          ) : connectedCount > 0 ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
        </motion.div>

        {/* Signal waves */}
        {connectedCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                variants={waveVariants}
                animate="active"
                style={{ animationDelay: `${i * 0.5}s` }}
                className="absolute w-full h-full rounded-full border-2 border-green-400/30"
              />
            ))}
          </div>
        )}

        {/* Network activity indicators */}
        <div className="absolute -top-1 -right-1 space-y-1">
          <AnimatePresence>
            {networkActivity.slice(-2).map((activity) => (
              <motion.div
                key={activity.id}
                variants={activityVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "w-2 h-2 rounded-full",
                  activity.type === 'upload' 
                    ? "bg-blue-500" 
                    : "bg-green-500"
                )}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Signal strength bars */}
      <div className="flex items-end space-x-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: 4 }}
            animate={{ 
              height: i < signalStrength ? [4, 8 + i * 2, 4 + i * 2] : 4,
              opacity: i < signalStrength ? 1 : 0.3
            }}
            transition={{
              duration: 0.5,
              delay: i * 0.1,
              repeat: i < signalStrength ? Infinity : 0,
              repeatType: 'reverse'
            }}
            className={cn(
              "w-1 rounded-sm",
              i < signalStrength 
                ? "bg-green-500" 
                : "bg-gray-300"
            )}
            style={{ height: 4 + i * 2 }}
          />
        ))}
      </div>

      {/* Status badge */}
      <Badge 
        variant={
          connectedCount === totalServers && totalServers > 0 ? 'default' :
          connectedCount > 0 ? 'secondary' : 'outline'
        }
        className="gap-1 text-xs"
      >
        <Activity className="w-3 h-3" />
        {connectedCount}/{totalServers}
      </Badge>

      {/* Live activity indicator */}
      {networkActivity.length > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center space-x-1"
        >
          <div className="flex space-x-1">
            <motion.div
              animate={{
                y: [-2, -4, -2],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <ArrowUp className="w-3 h-3 text-blue-500" />
            </motion.div>
            <motion.div
              animate={{
                y: [2, 4, 2],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5
              }}
            >
              <ArrowDown className="w-3 h-3 text-green-500" />
            </motion.div>
          </div>
          <span className="text-xs text-muted-foreground">Live</span>
        </motion.div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function MCPNetworkBadge({ servers }: { servers: any[] }) {
  const connectedCount = servers.filter(s => s.connectionState?.status === 'connected').length;
  const totalServers = servers.length;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex items-center space-x-2"
    >
      <div className="relative">
        <motion.div
          animate={connectedCount > 0 ? {
            scale: [1, 1.1, 1],
            transition: {
              duration: 2,
              repeat: Infinity
            }
          } : {}}
          className={cn(
            "w-2 h-2 rounded-full",
            connectedCount === totalServers && totalServers > 0
              ? "bg-green-500"
              : connectedCount > 0
              ? "bg-yellow-500"
              : "bg-red-500"
          )}
        />
        
        {connectedCount > 0 && (
          <motion.div
            animate={{
              scale: [1, 2, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut'
            }}
            className="absolute inset-0 rounded-full bg-green-400"
          />
        )}
      </div>
      
      <span className="text-xs font-medium">
        {connectedCount}/{totalServers}
      </span>
    </motion.div>
  );
}