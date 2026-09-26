'use client';
import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TrendingUp, Droplet } from 'lucide-react';
import { useMacro } from '@/hooks/use-macro';

export function OilCorrelationChart() {
  const { data, isLoading, error } = useMacro();

  if (isLoading) return <Card className="w-full h-[400px] animate-pulse bg-muted/20" />;
  if (error || !data || !data.oil_records?.length) return null;

  const chartData = [...data.oil_records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const minPrice = Math.floor(Math.min(...chartData.map(d => d.brent_crude_usd)) - 2);
  const maxPrice = Math.ceil(Math.max(...chartData.map(d => d.brent_crude_usd)) + 2);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="h-5 w-5 text-blue-500" />
              Predictive Macro: Brent Crude (ATF Leading Indicator)
            </CardTitle>
            <CardDescription>Daily global oil closing prices vs predictive airfare impact</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-math">${data.latest_oil_usd}</p>
            <p className="text-sm text-muted-foreground">Latest per barrel</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                domain={[minPrice, maxPrice]} 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              />
              <Line 
                type="monotone" 
                dataKey="brent_crude_usd" 
                name="Brent Crude (USD)"
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2 }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-blue-500">
          <TrendingUp className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="font-medium">
            {data.correlation_insight}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
