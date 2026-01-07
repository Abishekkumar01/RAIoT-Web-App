"use client";

import { useEffect, useState } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink, Users, Calendar, Bot } from "lucide-react";
import { getProjects } from "@/lib/firebase/projects";
import { Project } from "@/lib/types/project";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "ongoing":
        return "bg-blue-500";
      case "planned":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "ongoing":
        return "In Progress";
      case "planned":
        return "Planned";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <div className="max-w-[1920px] mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1
            className="text-5xl md:text-7xl font-black font-orbitron mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            Our Projects
          </h1>
          <p className="text-xl text-muted-foreground">
            Innovative solutions built by RAIoT members
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-20 pb-20">
            {projects.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p>No projects found yet. Stay tuned!</p>
              </div>
            ) : (
              Object.entries(
                projects.reduce((acc, project) => {
                  const batch = project.batch || "Other Projects";
                  if (!acc[batch]) acc[batch] = [];
                  acc[batch].push(project);
                  return acc;
                }, {} as Record<string, Project[]>)
              )
                .sort(([a], [b]) => b.localeCompare(a)) // Sort batches descending (e.g. 2026 before 2025)
                .map(([batch, batchProjects]) => {
                  // Get highlight text from the first project that has it in this batch
                  const highlightText = batchProjects.find(p => p.batchHighlight)?.batchHighlight;

                  return (
                    <ProjectBatchGroup key={batch} batch={batch} projects={batchProjects} />
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectBatchGroup({ batch, projects }: { batch: string, projects: Project[] }) {
  // Get highlight text from the first project that has it in this batch
  const highlightText = projects.find(p => p.batchHighlight)?.batchHighlight;

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "ongoing": return "In Progress";
      case "planned": return "Planned";
      default: return "Unknown";
    }
  };

  return (
    <div className="space-y-10 relative">
      {/* Batch Header */}
      <div className="relative flex flex-col items-center justify-center pt-8">
        <div className="absolute left-0 top-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent"></div>
        <div className="z-10 bg-[#0a0a0a] px-4 flex flex-col items-center gap-2">
          <div className="border border-cyan-500/30 bg-black/80 backdrop-blur-xl rounded-full px-12 py-3 text-cyan-400 font-orbitron tracking-[0.15em] uppercase text-lg shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] relative overflow-hidden group">
            <span className="relative z-10 font-bold">{batch}</span>
            <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </div>

          {/* Highlight Text */}
          {highlightText && (
            <div className="text-cyan-300/80 text-sm font-light tracking-widest uppercase animate-pulse">
              {highlightText}
            </div>
          )}
        </div>
        <div className="absolute left-0 top-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent blur-sm"></div>
      </div>

      {/* Project Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="bg-black border-white/10 text-zinc-100 overflow-hidden hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] group flex flex-col relative w-full h-full rounded-xl"
          >
            {/* Tech Deco Lines */}
            <div className="absolute top-0 left-0 w-20 h-1 bg-gradient-to-r from-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 right-0 w-20 h-1 bg-gradient-to-l from-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="h-64 bg-zinc-900/50 relative w-full overflow-hidden border-b border-white/5">
              {project.image ? (
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <Bot className="h-12 w-12 text-zinc-800" />
                </div>
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

              {/* Status Badge Positioned on Image for 'Poster' look */}
              <div className="absolute top-3 left-3">
                <Badge
                  className={`${project.status === "completed"
                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                    : project.status === "ongoing"
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                    } backdrop-blur-md border px-3 py-1 text-xs font-bold tracking-wider shadow-lg`}
                >
                  {getStatusText(project.status).toUpperCase()}
                </Badge>
              </div>
            </div>

            <CardHeader className="space-y-3 pb-2 pt-5 bg-black relative z-10">
              <div className="flex items-center justify-end absolute top-4 right-4">
                {project.completedDate && (
                  <div className="flex items-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold border border-white/10 px-2 py-1 rounded bg-zinc-900/50">
                    <Calendar className="h-3 w-3 mr-1.5 text-cyan-500" />
                    {project.completedDate}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <CardTitle className="text-xl font-black tracking-wide text-white line-clamp-1 group-hover:text-cyan-400 transition-colors uppercase font-orbitron drop-shadow-md">
                  {project.title}
                </CardTitle>
                <CardDescription className="line-clamp-6 text-zinc-400 text-xs leading-relaxed font-mono">
                  {project.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-auto space-y-6 bg-black relative z-10 pb-6">
              <div>
                <h4 className="text-[10px] font-bold text-cyan-600 uppercase tracking-[0.2em] mb-3 flex items-center">
                  <span className="w-2 h-2 bg-cyan-600 rounded-full mr-2 animate-pulse" />
                  Technologies
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {project.technologies?.slice(0, 5).map((tech) => (
                    <Badge
                      key={tech}
                      variant="outline"
                      className="bg-zinc-900/80 text-zinc-300 border-white/10 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors rounded px-2 py-1 text-[10px] font-medium uppercase tracking-tight font-mono"
                    >
                      {tech}
                    </Badge>
                  ))}
                  {(project.technologies?.length || 0) > 5 && (
                    <Badge
                      variant="outline"
                      className="bg-zinc-900/80 text-zinc-500 border-white/10 rounded px-2 py-1 text-[10px] font-mono"
                    >
                      +{project.technologies.length - 5}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-cyan-600 uppercase tracking-[0.2em] mb-2 flex items-center">
                  <Users className="h-3 w-3 mr-2" />
                  Team
                </h4>
                <p className="text-xs text-zinc-500 font-mono pl-5">
                  {project.teamMembers?.join(", ")}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                {project.githubLink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1 border-white/10 bg-zinc-900/30 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all font-mono uppercase text-xs tracking-wider"
                  >
                    <a
                      href={project.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="h-3.5 w-3.5 mr-2" />
                      Code
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="flex-1 border-white/5 bg-zinc-900/20 text-zinc-700 font-mono uppercase text-xs tracking-wider"
                  >
                    <Github className="h-3.5 w-3.5 mr-2" />
                    Code
                  </Button>
                )}

                {project.demoLink ? (
                  <Button
                    size="sm"
                    asChild
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/20 transition-all font-mono uppercase text-xs tracking-wider"
                  >
                    <a
                      href={project.demoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Demo
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    className="flex-1 bg-zinc-800 text-zinc-600 font-mono uppercase text-xs tracking-wider"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Demo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
