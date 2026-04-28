import React from 'react';

export const GlobalAudioContext = React.createContext<{
    globalPlayer: { url: string, title: string, id: string } | null;
    setGlobalPlayer: (player: { url: string, title: string, id: string } | null) => void;
} | null>(null);
