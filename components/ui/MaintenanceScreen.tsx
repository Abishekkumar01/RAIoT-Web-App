"use client";

import React from "react";
import { Terminal, Construction, AlertTriangle } from "lucide-react";

const MaintenanceScreen = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-[#001233] text-cyan-400 font-mono flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* Background Matrix/Grid Effect */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, .3) 25%, rgba(0, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, .3) 75%, rgba(0, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, .3) 25%, rgba(0, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, .3) 75%, rgba(0, 255, 255, .3) 76%, transparent 77%, transparent)`,
                    backgroundSize: '50px 50px'
                }}
            ></div>

            <div className="max-w-3xl w-full border border-cyan-500/30 bg-[#000a1f]/90 backdrop-blur-sm p-8 rounded-lg shadow-[0_0_50px_rgba(0,255,255,0.1)] relative z-10">

                {/* Header */}
                <div className="flex items-center gap-4 border-b border-cyan-500/30 pb-6 mb-6">
                    <div className="h-16 w-16 bg-cyan-900/20 rounded-full flex items-center justify-center border border-cyan-500/50 animate-pulse">
                        <AlertTriangle className="h-8 w-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-2">
                            SYSTEM <span className="text-cyan-400">MAINTENANCE</span>
                        </h1>
                        <p className="text-cyan-400/60 uppercase tracking-widest text-sm">
                            Protocol: 0xMAINT_MODE_ACTIVE
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <div className="flex gap-4 items-start bg-black/40 p-4 rounded border-l-2 border-cyan-500">
                        <Terminal className="h-6 w-6 mt-1 shrink-0 text-cyan-500" />
                        <div className="font-mono text-sm md:text-base space-y-2 text-gray-300">
                            <p>
                                <span className="text-green-500">root@raiot:~$</span> systemctl status web-portal
                            </p>
                            <p>
                                <span className="text-yellow-400">●</span> <span className="text-white">maintenance.service - RAIoT Web Portal Maintenance</span>
                            </p>
                            <p className="pl-4">
                                Loaded: loaded (/etc/systemd/system/maintenance.service; enabled)<br />
                                Active: <span className="text-cyan-400 font-bold">active (running)</span> since Now
                            </p>
                            <p className="pl-4 pt-2 text-cyan-300/80">
                                Process: Imminent Upgrades & System Optimization<br />
                                Status: "We are currently improving the platform for a better experience."
                            </p>
                        </div>
                    </div>

                    <div className="text-center md:text-left">
                        <p className="text-lg text-white mb-4">
                            The RAIoT portal is currently offline for scheduled maintenance.
                        </p>
                        <div className="flex flex-col md:flex-row gap-8 text-sm text-cyan-400/70">
                            <div className="flex items-center gap-2">
                                <Construction className="h-4 w-4" />
                                <span>Estimated downtime: Until we code it better</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-cyan-500/20 flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-xs text-cyan-600/60 uppercase">System Error Code</p>
                            <p className="text-xl font-mono text-cyan-500">STOP: 0x00000000 (MAINTENANCE)</p>
                        </div>
                        <div className="animate-pulse">
                            <div className="h-2 w-24 bg-cyan-900 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400 w-2/3 animate-[loading_2s_ease-in-out_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-4 text-xs text-cyan-900 font-mono">
                RAIoT Dev Team | Systems Operational Check
            </div>
        </div>
    );
};

export default MaintenanceScreen;
