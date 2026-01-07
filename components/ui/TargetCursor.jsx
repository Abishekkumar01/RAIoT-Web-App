"use client"

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { gsap } from "gsap";
import { usePathname } from "next/navigation";

const TargetCursor = ({
  targetSelector = ".cursor-target",
  spinDuration = 2,
  hideDefaultCursor = true,
}) => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const cursorRef = useRef(null);
  const cornersRef = useRef(null);
  const spinTl = useRef(null);
  const dotRef = useRef(null);



  // State refs to track cursor status across renders/closures
  const activeTargetRef = useRef(null);
  const currentLeaveHandlerRef = useRef(null);
  const currentTargetMoveRef = useRef(null);
  const isAnimatingToTargetRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  const constants = useMemo(
    () => ({
      borderWidth: 2,
      cornerSize: 20,
      parallaxStrength: 0.00005,
    }),
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Force reset on route change
  useEffect(() => {
    if (!mounted || !cursorRef.current) return;

    // Cleanup active targets
    if (activeTargetRef.current || currentLeaveHandlerRef.current) {
      if (currentLeaveHandlerRef.current) {
        currentLeaveHandlerRef.current();
      }
      activeTargetRef.current = null;
      activeTargetRef.current = null;
      isAnimatingToTargetRef.current = false;
    }

    // Fix: If we killed tweens on the cursor (which we do on hover), the timeline might be broken.
    // We should recreate the spin timeline to be safe.
    if (spinTl.current) {
      spinTl.current.kill();
    }

    // Recreate spin timeline
    spinTl.current = gsap
      .timeline({ repeat: -1 })
      .to(cursorRef.current, { rotation: "+=360", duration: spinDuration, ease: "none" });

    // Reset corners to default
    if (cornersRef.current) {
      const corners = Array.from(cornersRef.current);
      gsap.killTweensOf(corners); // Kill any corner animations

      const { cornerSize } = constants;
      const positions = [
        { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: cornerSize * 0.5 },
        { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
      ];

      const tl = gsap.timeline();
      corners.forEach((corner, index) => {
        if (corner) {
          tl.to(
            corner,
            {
              x: positions[index].x,
              y: positions[index].y,
              duration: 0.3,
              ease: "power3.out",
              overwrite: true
            },
            0
          );
        }
      });
    }

  }, [pathname, mounted, constants, spinDuration]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Simple delay to let loader finish, then initialize cursor
    const initDelay = setTimeout(() => {
      initCursor();
    }, 1000); // Wait 1 second for loader to potentially finish

    const initCursor = () => {
      // console.log('TargetCursor mounted and running!');

      if (!cursorRef.current) {
        // console.error('Cursor ref not found!');
        return;
      }

      if (typeof gsap === 'undefined') {
        console.error('GSAP is not loaded!');
        return;
      }

      const originalCursor = document.body.style.cursor;
      if (hideDefaultCursor) {
        document.body.style.cursor = 'none';
      }

      const cursor = cursorRef.current;
      cornersRef.current = cursor.querySelectorAll(".target-cursor-corner");

      const cleanupTarget = (target) => {
        if (currentTargetMoveRef.current) {
          target.removeEventListener("mousemove", currentTargetMoveRef.current);
        }
        if (currentLeaveHandlerRef.current) {
          target.removeEventListener("mouseleave", currentLeaveHandlerRef.current);
        }
        currentTargetMoveRef.current = null;
        currentLeaveHandlerRef.current = null;
      };

      // Initial position (center of screen, but hidden/waiting)
      // We set initial position via GSAP set to ensure transforms are correct from start
      gsap.set(cursor, {
        xPercent: -50,
        yPercent: -50,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });

      const createSpinTimeline = () => {
        if (spinTl.current) {
          spinTl.current.kill();
        }
        spinTl.current = gsap
          .timeline({ repeat: -1 })
          .to(cursor, { rotation: "+=360", duration: spinDuration, ease: "none" });
      };

      createSpinTimeline();

      const moveHandler = (e) => {
        // Fallback to simple gsap.to which is more robust than quickTo in some edge cases
        if (cursorRef.current) {
          gsap.to(cursorRef.current, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.1, // Very fast buffer
            ease: "power2.out",
            overwrite: "auto"
          });
        }
      };

      // Use efficient event listener detection
      // Adding it to window is fine, but we can make it passive for scroll performance if it were scroll related
      window.addEventListener("mousemove", moveHandler);

      const scrollHandler = () => {
        if (!activeTargetRef.current || !cursorRef.current) return;

        // Optimized check: getBoundingClientRect is fast enough for single element check if throttled, 
        // but here we just check if element under cursor is still the target.
        // We need current mouse position. Since we don't track it in state, we might need to rely on last known pos
        // or just let the mousemove handle "leaving" naturally if the user moves mouse.
        // However, if we scroll the target AWAY from the mouse, we need to know.

        // This part is tricky to optimize fully without tracking mouse pos globally perfectly.
        // For now, we'll leave it but ensure it's not too heavy. 
        // Logic: Check if element under *current cursor position* is the active target.

        const mouseX = gsap.getProperty(cursorRef.current, "x");
        const mouseY = gsap.getProperty(cursorRef.current, "y");

        // ElementFromPoint can be expensive if called excessively, but scroll event fires often.
        // Throttling this check or simply trusting mouseleave might be better, 
        // but for "sticky" targets that move on scroll, we need this check.
        const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);

        // Use .contains or closest check
        const isStillOverTarget = elementUnderMouse && (
          elementUnderMouse === activeTargetRef.current ||
          activeTargetRef.current.contains(elementUnderMouse)
        );

        if (!isStillOverTarget) {
          // If we scrolled away, trigger leave
          if (currentLeaveHandlerRef.current) {
            currentLeaveHandlerRef.current();
          }
        }
      };

      window.addEventListener("scroll", scrollHandler, { passive: true });

      const mouseDownHandler = () => {
        if (!dotRef.current) return;
        gsap.to(dotRef.current, { scale: 0.7, duration: 0.2, overwrite: true });
        gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2, overwrite: true });
      };

      const mouseUpHandler = () => {
        if (!dotRef.current) return;
        gsap.to(dotRef.current, { scale: 1, duration: 0.3, overwrite: true });
        gsap.to(cursorRef.current, { scale: 1, duration: 0.2, overwrite: true });
      };

      window.addEventListener("mousedown", mouseDownHandler);
      window.addEventListener("mouseup", mouseUpHandler);

      const enterHandler = (e) => {
        // Optimized target detection using .closest()
        const target = e.target.closest?.(targetSelector);

        if (!target || !cursorRef.current || !cornersRef.current) return;
        if (activeTargetRef.current === target) return;

        if (activeTargetRef.current) {
          cleanupTarget(activeTargetRef.current);
        }

        if (resumeTimeoutRef.current) {
          clearTimeout(resumeTimeoutRef.current);
          resumeTimeoutRef.current = null;
        }

        activeTargetRef.current = target;

        gsap.killTweensOf(cursorRef.current, "rotation");
        spinTl.current?.pause();

        gsap.set(cursorRef.current, { rotation: 0 });

        const updateCorners = (mouseX, mouseY) => {
          const rect = target.getBoundingClientRect();
          const cursorRect = cursorRef.current.getBoundingClientRect();

          const cursorCenterX = cursorRect.left + cursorRect.width / 2;
          const cursorCenterY = cursorRect.top + cursorRect.height / 2;

          const [tlc, trc, brc, blc] = Array.from(cornersRef.current);

          const { borderWidth, cornerSize, parallaxStrength } = constants;
          // Calculate base offsets
          // We calculate these based on the CENTER of the cursor vs the target rect
          // But since the cursor follows the mouse, and we want corners to snap to target...
          // OR the main cursor snaps to target center?

          // Original logic: The implementation didn't snap the WHOLE cursor to the target center. 
          // It calculated offsets to move corners to the target bounds relative to the cursor center.
          // This keeps the cursor mostly on mouse but "explodes" corners to the button.

          // To keep it lightweight, we simplify.

          let tlOffset = {
            x: rect.left - cursorCenterX - borderWidth,
            y: rect.top - cursorCenterY - borderWidth,
          };
          let trOffset = {
            x: rect.right - cursorCenterX + borderWidth - cornerSize,
            y: rect.top - cursorCenterY - borderWidth,
          };
          let brOffset = {
            x: rect.right - cursorCenterX + borderWidth - cornerSize,
            y: rect.bottom - cursorCenterY + borderWidth - cornerSize,
          };
          let blOffset = {
            x: rect.left - cursorCenterX - borderWidth,
            y: rect.bottom - cursorCenterY + borderWidth - cornerSize,
          };

          if (mouseX !== undefined && mouseY !== undefined) {
            // Parallax effect
            const targetCenterX = rect.left + rect.width / 2;
            const targetCenterY = rect.top + rect.height / 2;
            const mouseOffsetX = (mouseX - targetCenterX) * parallaxStrength;
            const mouseOffsetY = (mouseY - targetCenterY) * parallaxStrength;

            tlOffset.x += mouseOffsetX;
            tlOffset.y += mouseOffsetY;
            trOffset.x += mouseOffsetX;
            trOffset.y += mouseOffsetY;
            brOffset.x += mouseOffsetX;
            brOffset.y += mouseOffsetY;
            blOffset.x += mouseOffsetX;
            blOffset.y += mouseOffsetY;
          }

          const tl = gsap.timeline();
          const corners = [tlc, trc, brc, blc];
          const offsets = [tlOffset, trOffset, brOffset, blOffset];

          corners.forEach((corner, index) => {
            if (corner) {
              tl.to(
                corner,
                {
                  x: offsets[index].x,
                  y: offsets[index].y,
                  duration: 0.2,
                  ease: "power2.out",
                  overwrite: true // Ensure we don't stack animations
                },
                0
              );
            }
          });
        };

        isAnimatingToTargetRef.current = true;
        updateCorners();

        // Small timeout to prevent immediate re-triggering issues
        setTimeout(() => {
          isAnimatingToTargetRef.current = false;
        }, 1);

        let moveThrottle = null;
        const targetMove = (ev) => {
          if (moveThrottle || isAnimatingToTargetRef.current) return;
          moveThrottle = requestAnimationFrame(() => {
            const mouseEvent = ev;
            updateCorners(mouseEvent.clientX, mouseEvent.clientY);
            moveThrottle = null;
          });
        };

        const leaveHandler = () => {
          activeTargetRef.current = null;
          isAnimatingToTargetRef.current = false;

          if (cornersRef.current) {
            const corners = Array.from(cornersRef.current);
            gsap.killTweensOf(corners);

            const { cornerSize } = constants;
            const positions = [
              { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
              { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
              { x: cornerSize * 0.5, y: cornerSize * 0.5 },
              { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
            ];

            const tl = gsap.timeline();
            corners.forEach((corner, index) => {
              if (corner) {
                // Return to original clustered position
                tl.to(
                  corner,
                  {
                    x: positions[index].x,
                    y: positions[index].y,
                    duration: 0.3,
                    ease: "power3.out",
                    overwrite: true
                  },
                  0
                );
              }
            });
          }

          // Resume spinning
          resumeTimeoutRef.current = setTimeout(() => {
            if (!activeTargetRef.current && cursorRef.current && spinTl.current) {
              // Smoothly resume spin
              const currentRotation = gsap.getProperty(
                cursorRef.current,
                "rotation"
              );
              const normalizedRotation = currentRotation % 360;

              spinTl.current.kill();
              spinTl.current = gsap
                .timeline({ repeat: -1 })
                .to(cursorRef.current, { rotation: "+=360", duration: spinDuration, ease: "none" });

              // Jump to current rotation + 360 to continue
              gsap.to(cursorRef.current, {
                rotation: normalizedRotation + 360,
                duration: spinDuration * (1 - normalizedRotation / 360),
                ease: "none",
                onComplete: () => {
                  spinTl.current?.restart();
                },
              });
            }
            resumeTimeoutRef.current = null;
          }, 50);

          cleanupTarget(target);
        };

        currentTargetMoveRef.current = targetMove;
        currentLeaveHandlerRef.current = leaveHandler;

        target.addEventListener("mousemove", targetMove);
        target.addEventListener("mouseleave", leaveHandler);
      };

      // Use active detection instead of passive for instant feedback if possible, 
      // but passive is better for scroll/performance. mouseover is generally fine.
      window.addEventListener("mouseover", enterHandler, { passive: true });

      return () => {
        window.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseover", enterHandler);
        window.removeEventListener("scroll", scrollHandler);
        window.removeEventListener("mousedown", mouseDownHandler);
        window.removeEventListener("mouseup", mouseUpHandler);

        if (activeTargetRef.current) {
          cleanupTarget(activeTargetRef.current);
        }

        spinTl.current?.kill();
        document.body.style.cursor = originalCursor;
      };
    };

    return () => {
      clearTimeout(initDelay);
    };
  }, [targetSelector, spinDuration, constants, hideDefaultCursor]);

  useEffect(() => {
    if (!cursorRef.current || !spinTl.current) return;

    if (spinTl.current.isActive()) {
      spinTl.current.kill(); // Restart if speed changes
      // ... existing logic to restart
      // Simplified for update just to ensure consistency
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursorRef.current, { rotation: "+=360", duration: spinDuration, ease: "none" });
    }
  }, [spinDuration]);

  if (!mounted) return null;

  return (
    <>
      {/* Main animated cursor - Tech/Robotics Theme */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-12 h-12 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 cursor-main"
        style={{
          willChange: 'transform',
          background: 'radial-gradient(circle, rgba(0, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0.8) 70%)',
          border: '2px solid #00ffff',
          borderRadius: '50%',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.3)',
          zIndex: 2147483647
        }}
      >
        {/* Central Robot Eye */}
        <div
          ref={dotRef}
          className="absolute left-1/2 top-1/2 w-3 h-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg cursor-eye"
          style={{
            willChange: 'transform',
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.8), inset 0 0 5px rgba(255, 255, 255, 0.5)',
            zIndex: 2147483647
          }}
        />

        {/* Corner Tech Elements - Fixed positioning */}
        {/* We use initial positions that group them near the center */}
        {/* Top Left */}
        <div
          className="target-cursor-corner absolute w-5 h-5 shadow-lg cursor-corner"
          style={{
            willChange: 'transform',
            background: 'linear-gradient(45deg, transparent 40%, #00ffff 40%, #00ffff 60%, transparent 60%)',
            border: '0.5px solid #00ffff',
            borderRadius: '2px',
            left: '50%',
            top: '50%',
            transform: 'translate(-150%, -150%)', // Default position
            zIndex: 2147483647
          }}
        />
        {/* Top Right */}
        <div
          className="target-cursor-corner absolute w-5 h-5 shadow-lg cursor-corner"
          style={{
            willChange: 'transform',
            background: 'linear-gradient(-45deg, transparent 40%, #00ffff 40%, #00ffff 60%, transparent 60%)',
            border: '0.5px solid #00ffff',
            borderRadius: '2px',
            left: '50%',
            top: '50%',
            transform: 'translate(50%, -150%)', // Default position
            zIndex: 2147483647
          }}
        />
        {/* Bottom Right */}
        <div
          className="target-cursor-corner absolute w-5 h-5 shadow-lg cursor-corner"
          style={{
            willChange: 'transform',
            background: 'linear-gradient(45deg, transparent 40%, #00ffff 40%, #00ffff 60%, transparent 60%)',
            border: '0.5px solid #00ffff',
            borderRadius: '2px',
            left: '50%',
            top: '50%',
            transform: 'translate(50%, 50%)', // Default position
            zIndex: 2147483647
          }}
        />
        {/* Bottom Left */}
        <div
          className="target-cursor-corner absolute w-5 h-5 shadow-lg cursor-corner"
          style={{
            willChange: 'transform',
            background: 'linear-gradient(-45deg, transparent 40%, #00ffff 40%, #00ffff 60%, transparent 60%)',
            border: '0.5px solid #00ffff',
            borderRadius: '2px',
            left: '50%',
            top: '50%',
            transform: 'translate(-150%, 50%)', // Default position
            zIndex: 2147483647
          }}
        />

        {/* Scanning Ring */}
        <div
          className="absolute left-1/2 top-1/2 w-8 h-8 border border-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-50 cursor-ring"
          style={{
            willChange: 'transform',
            animation: 'pulse 2s infinite',
            zIndex: 2147483647
          }}
        />
      </div>
    </>
  );
};

export default TargetCursor;