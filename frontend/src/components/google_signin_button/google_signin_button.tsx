"use client";

import { useEffect, useRef } from "react";

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = "continue_with",
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Google Sign-In script is loaded
    const initializeGoogleSignIn = () => {
      if (window.google && buttonRef.current) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        
        if (!clientId) {
          onError("Google Client ID not configured");
          return;
        }

        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response.credential) {
                onSuccess(response.credential);
              } else {
                onError("Failed to get credential from Google");
              }
            },
          });

          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            text: text,
            width: buttonRef.current.offsetWidth,
          });
        } catch (error) {
          onError("Failed to initialize Google Sign-In");
          console.error("Google Sign-In initialization error:", error);
        }
      }
    };

    // If Google script is already loaded
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      // Wait for script to load
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initializeGoogleSignIn();
        }
      }, 100);

      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);

      return () => clearInterval(interval);
    }
  }, [onSuccess, onError, text]);

  return <div ref={buttonRef} className="w-full" />;
}

