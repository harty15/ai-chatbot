'use client';

import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Activity, 
  Zap, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Cpu,
  Network,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedStatsProps {
  stats: {
    totalServers: number;
    connectedServers: number;
    totalTools: number;
    totalExecutions: number;
    avgResponseTime?: number;
    successRate?: number;
  };
  loading?: boolean;
}

function CountUpAnimation({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(value * easeOutQuart));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  suffix = '', 
  trend, 
  color = 'blue',
  index,
  loading = false 
}: {
  icon: any;
  title: string;
  value: number;
  suffix?: string;
  trend?: number;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  index: number;
  loading?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    hover: {
      scale: 1.05,
      y: -2,
      transition: {
        duration: 0.2,
        ease: 'easeOut'
      }
    }
  };

  const iconVariants = {
    idle: { rotate: 0, scale: 1 },
    hover: { 
      rotate: 360, 
      scale: 1.1,
      transition: {
        duration: 0.6,
        ease: 'easeInOut'
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-blue-500/10",
        loading && "animate-pulse"
      )}>
        {/* Animated background */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "absolute inset-0 opacity-5",
                color === 'blue' && "bg-blue-400",
                color === 'green' && "bg-green-400", 
                color === 'purple' && "bg-purple-400",
                color === 'orange' && "bg-orange-400",
                color === 'red' && "bg-red-400"
              )}
            />
          )}
        </AnimatePresence>

        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <motion.p 
                className="text-sm font-medium text-muted-foreground"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                {title}
              </motion.p>
              
              <motion.div 
                className="text-3xl font-bold tracking-tight"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: 0.3 + index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                  damping: 10
                }}
              >
                {loading ? (
                  <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    <CountUpAnimation value={value} duration={1000 + index * 200} />
                    {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
                  </>
                )}
              </motion.div>

              {/* Trend indicator */}
              {trend !== undefined && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center space-x-1"
                >
                  <TrendingUp className={cn(
                    "w-3 h-3",
                    trend > 0 ? "text-green-600" : "text-red-600"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    trend > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {trend > 0 ? '+' : ''}{trend}%
                  </span>
                </motion.div>
              )}
            </div>

            <motion.div
              variants={iconVariants}
              animate={isHovered ? 'hover' : 'idle'}
              className={cn(
                "p-3 rounded-lg border-2",
                colorClasses[color]
              )}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
          </div>

          {/* Loading pulse */}
          {loading && (
            <motion.div
              variants={pulseVariants}
              animate="pulse"
              className="absolute inset-0 bg-blue-400/5 rounded-lg"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function MCPAnimatedStats({ stats, loading = false }: AnimatedStatsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const statCards = [
    {
      icon: Server,
      title: 'Total Servers',
      value: stats.totalServers,
      color: 'blue' as const,
      trend: 12
    },
    {
      icon: CheckCircle2,
      title: 'Connected',
      value: stats.connectedServers,
      color: 'green' as const,
      trend: 8
    },
    {
      icon: Zap,
      title: 'Available Tools',
      value: stats.totalTools,
      color: 'purple' as const,
      trend: 24
    },
    {
      icon: Activity,
      title: 'Total Executions',
      value: stats.totalExecutions,
      color: 'orange' as const,
      trend: 15
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {statCards.map((stat, index) => (
        <StatCard
          key={stat.title}
          icon={stat.icon}
          title={stat.title}
          value={stat.value}
          color={stat.color}
          trend={stat.trend}
          index={index}
          loading={loading}
        />
      ))}
    </motion.div>
  );
}

// Real-time activity feed with smooth animations
export function MCPActivityFeed({ activities = [] }: { activities: any[] }) {
  const [visibleActivities, setVisibleActivities] = useState<any[]>([]);

  useEffect(() => {
    // Animate in activities one by one
    activities.forEach((activity, index) => {
      setTimeout(() => {
        setVisibleActivities(prev => [...prev, activity]);
      }, index * 150);
    });
  }, [activities]);

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    },
    exit: {
      opacity: 0,
      x: 20,
      scale: 0.95,
      transition: {
        duration: 0.3
      }
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'connection': return Network;
      case 'execution': return Cpu;
      case 'error': return AlertTriangle;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'connection': return 'text-blue-600 bg-blue-50';
      case 'execution': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Recent Activity</h3>
          <Badge variant="secondary" className="ml-auto">
            Live
          </Badge>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {visibleActivities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              
              return (
                <motion.div
                  key={activity.id || index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className={cn(
                      "p-2 rounded-full",
                      getActivityColor(activity.type)
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <motion.p 
                      className="text-sm font-medium truncate"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {activity.message}
                    </motion.p>
                    
                    <motion.div
                      className="flex items-center space-x-2 mt-1"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <span className="text-xs text-muted-foreground">
                        {activity.serverName}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </span>
                    </motion.div>
                  </div>

                  {activity.duration && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center space-x-1 text-xs text-muted-foreground"
                    >
                      <Timer className="w-3 h-3" />
                      <span>{activity.duration}ms</span>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {visibleActivities.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}