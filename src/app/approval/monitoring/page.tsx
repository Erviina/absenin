"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";

export default function MonitoringPage() {
  const teamTodos = [
    {
      id: 1,
      name: "Budi Santoso",
      avatar: "https://i.pravatar.cc/150?u=budi",
      progress: 66,
      tasks: [
        { title: "Review PR #142", done: true },
        { title: "Sprint Planning", done: true },
        { title: "Bug Fix Login", done: false },
      ]
    },
    {
      id: 2,
      name: "Siti Aminah",
      avatar: "https://i.pravatar.cc/150?u=siti",
      progress: 100,
      tasks: [
        { title: "Design mockup absensi", done: true },
        { title: "Weekly report", done: true },
      ]
    },
    {
      id: 3,
      name: "Agus Riyadi",
      avatar: "https://i.pravatar.cc/150?u=agus",
      progress: 0,
      tasks: [
        { title: "Setup database schema", done: false },
        { title: "API authentication", done: false },
      ]
    }
  ];

  return (
    <>
      <Header title="Monitoring Tim" showNotification={false} />
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-foreground">To-Do List Harian</h2>
          <span className="text-xs font-medium text-muted-foreground">15 Jan 2025</span>
        </div>

        <div className="space-y-4">
          {teamTodos.map(user => (
            <Card key={user.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-sm">{user.name}</h4>
                      <p className="text-xs text-muted-foreground">{user.tasks.filter(t => t.done).length} dari {user.tasks.length} selesai</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">{user.progress}%</span>
                  </div>
                </div>
                
                <Progress value={user.progress} className="h-1.5 mb-4" />

                <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/50">
                  {user.tasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {task.done ? (
                        <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                      ) : (
                        <Clock size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span className={`text-[11px] ${task.done ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
