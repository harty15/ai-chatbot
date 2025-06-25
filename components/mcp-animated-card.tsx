'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Zap, 
  Activity,
  TrendingUp,
  Server,
  Play,
  Square,
  RefreshCw,
  Terminal,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedServerCardProps {
  server: any;
  onUpdate: (server: any) => void;
  onDelete: (serverId: string) => void;
  index: number;
}

export function AnimatedServerCard({ server, onUpdate, onDelete, index }: AnimatedServerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  
  const connectionStatus = server.connectionState?.status || 'disconnected';
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const hasError = connectionStatus === 'error';
  
  // Pulse effect for connecting state
  useEffect(() => {
    if (isConnecting) {
      const interval = setInterval(() => {
        setPulseKey(prev => prev + 1);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isConnecting]);

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    hover: {
      scale: 1.02,
      y: -4,
      transition: {
        duration: 0.2,
        ease: 'easeOut'
      }
    }
  };

  const statusVariants = {
    connected: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.6,
        ease: 'easeInOut'
      }
    },
    connecting: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    error: {
      x: [-2, 2, -2, 2, 0],
      transition: {
        duration: 0.4,
        ease: 'easeInOut'
      }
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return CheckCircle2;
      case 'connecting': return Clock;
      case 'error': return AlertCircle;
      default: return Server;
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-blue-500/10",
        isConnected && "ring-2 ring-green-500/20",
        hasError && "ring-2 ring-red-500/20",
        isConnecting && "ring-2 ring-blue-500/20"
      )}>
        {/* Animated background gradient */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50"
            />
          )}
        </AnimatePresence>
        
        {/* Connecting pulse overlay */}
        <AnimatePresence>
          {isConnecting && (
            <motion.div
              key={pulseKey}
              initial={{ opacity: 0.3, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute inset-0 bg-blue-400/10 rounded-lg"
            />
          )}
        </AnimatePresence>

        <CardHeader className="relative z-10 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                variants={statusVariants}
                animate={connectionStatus}
                className={cn(
                  "p-2 rounded-lg border",
                  getStatusColor()
                )}
              >
                <StatusIcon className="w-4 h-4" />
              </motion.div>
              
              <div>
                <motion.h3 
                  className="font-semibold text-lg"
                  layoutId={`server-name-${server.id}`}
                >
                  {server.name}
                </motion.h3>
                {server.description && (
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {server.description}
                  </motion.p>
                )}
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Badge 
                variant={isConnected ? 'default' : hasError ? 'destructive' : 'secondary'}
                className="capitalize"
              >
                {connectionStatus}
              </Badge>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 space-y-4">
          {/* Transport info with slide-in animation */}
          <motion.div 
            className="flex items-center space-x-4 text-sm"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              {server.transportType === 'stdio' ? (
                <Terminal className="w-4 h-4 text-blue-600" />
              ) : (
                <Globe className="w-4 h-4 text-green-600" />
              )}
              <span className="font-medium">{server.transportType?.toUpperCase()}</span>
            </div>
            
            {server.transportType === 'stdio' && server.command && (
              <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                {server.command}
              </code>
            )}
            
            {server.transportType === 'sse' && server.url && (
              <code className="px-2 py-1 bg-gray-100 rounded text-xs truncate max-w-48">
                {server.url}
              </code>
            )}
          </motion.div>

          {/* Tools with stagger animation */}
          {server.availableTools && server.availableTools.length > 0 && (
            <motion.div 
              className="space-y-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium">Available Tools</span>
              </div>
              
              <motion.div 
                className="flex flex-wrap gap-2"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
              >
                {server.availableTools.slice(0, 4).map((tool: any, idx: number) => (
                  <motion.div
                    key={tool.name}
                    variants={{
                      hidden: { opacity: 0, scale: 0.8 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Badge variant="outline" className="text-xs">
                      {tool.name}
                    </Badge>
                  </motion.div>
                ))}
                
                {server.availableTools.length > 4 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, scale: 0.8 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                  >
                    <Badge variant="outline" className="text-xs">
                      +{server.availableTools.length - 4} more
                    </Badge>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Stats with counter animation */}
          <motion.div 
            className="grid grid-cols-3 gap-4 pt-2 border-t"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-center">
              <motion.div 
                className="text-2xl font-bold text-blue-600"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
              >
                {server.availableTools?.length || 0}
              </motion.div>
              <div className="text-xs text-muted-foreground">Tools</div>
            </div>
            
            <div className="text-center">
              <motion.div 
                className="text-2xl font-bold text-green-600"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
              >
                {server.executionCount || 0}
              </motion.div>
              <div className="text-xs text-muted-foreground">Executions</div>
            </div>
            
            <div className="text-center">
              <motion.div 
                className="text-2xl font-bold text-purple-600"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              >
                {server.uptime ? Math.floor(server.uptime / 60) : 0}m
              </motion.div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
          </motion.div>

          {/* Action buttons with hover effects */}
          <motion.div 
            className="flex justify-between items-center pt-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex space-x-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  variant={isConnected ? 'outline' : 'default'}
                  onClick={() => {
                    // Handle connection toggle
                  }}
                  className="gap-2"
                >
                  {isConnected ? (
                    <>
                      <Square className="w-3 h-3" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Connect
                    </>
                  )}
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" variant="outline" className="gap-2">
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
              </motion.div>
            </div>
            
            <div className="flex space-x-1">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button size="sm" variant="ghost" className="p-2">
                  <Activity className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}