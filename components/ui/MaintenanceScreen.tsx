"use client";

import React from "react";
import { Construction } from "lucide-react";
import Link from "next/link";
import { Button } from "./button";

const MaintenanceScreen = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                        <Construction className="h-10 w-10 text-primary" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Under Maintenance</h1>
                    <p className="text-muted-foreground">
                        The website is currently undergoing scheduled maintenance. We will be back shortly.
                    </p>
                </div>

                <div className="pt-8 border-t">
                    <p className="text-xs text-muted-foreground mb-4">
                        Are you a team member?
                    </p>
                    <Link href="/auth/login">
                        <Button variant="outline" size="sm">
                            Team Login
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceScreen;
