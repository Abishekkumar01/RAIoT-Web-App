"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface LoaderContextType {
    hasLoaded: boolean;
    setHasLoaded: (loaded: boolean) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const LoaderProvider = ({ children }: { children: ReactNode }) => {
    const [hasLoaded, setHasLoaded] = useState(false);

    return (
        <LoaderContext.Provider value={{ hasLoaded, setHasLoaded }}>
            {children}
        </LoaderContext.Provider>
    );
};

export const useLoader = () => {
    const context = useContext(LoaderContext);
    if (context === undefined) {
        throw new Error("useLoader must be used within a LoaderProvider");
    }
    return context;
};
