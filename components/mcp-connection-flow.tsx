'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  ArrowRight,
  Server,
  Activity,
  Shield,
  Link
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionFlowProps {
  server: any;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function MCPConnectionFlow({ server, onConnect, onDisconnect }: ConnectionFlowProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStep, setConnectionStep] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  const connectionStatus = server.connectionState?.status || 'disconnected';
  const isConnected = connectionStatus === 'connected';

  const connectionSteps = [
    { 
      label: 'Initializing...', 
      icon: Server,
      description: 'Setting up connection parameters'
    },
    { 
      label: 'Authenticating...', 
      icon: Shield,
      description: 'Verifying server credentials'
    },
    { 
      label: 'Handshaking...', 
      icon: Link,
      description: 'Establishing secure connection'
    },
    { 
      label: 'Loading Tools...', 
      icon: Zap,
      description: 'Discovering available capabilities'
    }
  ];

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStep(0);
    
    // Simulate connection steps
    for (let i = 0; i < connectionSteps.length; i++) {
      setConnectionStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    try {
      await onConnect();
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setIsConnecting(false);
      }, 2000);
    } catch (error) {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await onDisconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const flowVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.3
      }
    }
  };

  const stepVariants = {
    inactive: {
      opacity: 0.3,
      scale: 0.9,
      x: -10
    },
    active: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    },
    complete: {
      opacity: 0.8,
      scale: 0.95,
      x: 10,
      transition: {
        duration: 0.3
      }
    }
  };

  const successVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 10
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg">Connection Status</h3>
            <p className="text-sm text-muted-foreground">
              Manage your MCP server connection
            </p>
          </div>
          
          <motion.div
            animate={isConnected ? 'pulse' : 'idle'}
            variants={pulseVariants}
          >
            <Badge 
              variant={isConnected ? 'default' : connectionStatus === 'error' ? 'destructive' : 'secondary'}
              className={cn(
                "gap-2 text-sm",
                isConnected && "bg-green-600 hover:bg-green-700"
              )}
            >
              {isConnected ? (
                <Wifi className="w-4 h-4" />
              ) : connectionStatus === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </Badge>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {isConnecting ? (
            <motion.div
              key="connecting"
              variants={flowVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              <div className="relative">
                {/* Progress bar */}
                <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 rounded-full">
                  <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((connectionStep + 1) / connectionSteps.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                {/* Connection steps */}
                <div className="space-y-4">
                  {connectionSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === connectionStep;
                    const isComplete = index < connectionStep;
                    const isInactive = index > connectionStep;

                    return (
                      <motion.div
                        key={step.label}
                        variants={stepVariants}
                        animate={
                          isComplete ? 'complete' : 
                          isActive ? 'active' : 'inactive'
                        }
                        className="flex items-center space-x-4 p-4 rounded-lg border"
                      >
                        <motion.div
                          className={cn(
                            "p-2 rounded-lg",
                            isActive && "bg-blue-50 text-blue-600 border border-blue-200",
                            isComplete && "bg-green-50 text-green-600 border border-green-200",
                            isInactive && "bg-gray-50 text-gray-400"
                          )}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isActive ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                              <Icon className="w-5 h-5" />
                            </motion.div>
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </motion.div>
                        
                        <div className="flex-1">
                          <motion.div
                            className={cn(
                              "font-medium",
                              isActive && "text-blue-900",
                              isComplete && "text-green-900",
                              isInactive && "text-gray-500"
                            )}
                          >
                            {step.label}
                          </motion.div>
                          <motion.div
                            className="text-sm text-muted-foreground"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: isActive ? 1 : 0.5 }}
                          >
                            {step.description}
                          </motion.div>
                        </div>

                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center space-x-2"
                          >
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          </motion.div>
                        )}

                        {isComplete && (
                          <motion.div
                            variants={successVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              variants={flowVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* Connection visualization */}
              <div className="flex items-center justify-center space-x-8 py-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center space-y-2"
                >
                  <div className={cn(
                    "p-4 rounded-xl border-2",
                    isConnected ? "bg-green-50 border-green-200 text-green-600" : 
                                 "bg-gray-50 border-gray-200 text-gray-400"
                  )}>
                    <Server className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-medium">Client</span>
                </motion.div>

                <div className="flex items-center space-x-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={isConnected ? {
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3]
                      } : {}}
                      transition={{
                        duration: 1.5,
                        repeat: isConnected ? Infinity : 0,
                        delay: i * 0.2
                      }}
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-green-500" : "bg-gray-300"
                      )}
                    />
                  ))}
                  
                  <ArrowRight className={cn(
                    "w-6 h-6 mx-2",
                    isConnected ? "text-green-500" : "text-gray-300"
                  )} />
                  
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={isConnected ? {
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3]
                      } : {}}
                      transition={{
                        duration: 1.5,
                        repeat: isConnected ? Infinity : 0,
                        delay: i * 0.2 + 0.5
                      }}
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-green-500" : "bg-gray-300"
                      )}
                    />
                  ))}
                </div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center space-y-2"
                >
                  <div className={cn(
                    "p-4 rounded-xl border-2",
                    isConnected ? "bg-blue-50 border-blue-200 text-blue-600" : 
                                 "bg-gray-50 border-gray-200 text-gray-400"
                  )}>
                    <Activity className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-medium">{server.name}</span>
                </motion.div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center space-x-4">
                {isConnected ? (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handleDisconnect}
                      variant="outline"
                      className="gap-2"
                    >
                      <WifiOff className="w-4 h-4" />
                      Disconnect
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handleConnect}
                      className="gap-2"
                    >
                      <Wifi className="w-4 h-4" />
                      Connect
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success animation overlay */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg"
            >
              <motion.div
                variants={successVariants}
                initial="hidden"
                animate="visible"
                className="text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 0.6,
                    ease: 'easeInOut'
                  }}
                >
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-lg font-semibold text-green-900">Connected!</h3>
                <p className="text-sm text-green-700">MCP server is ready to use</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}