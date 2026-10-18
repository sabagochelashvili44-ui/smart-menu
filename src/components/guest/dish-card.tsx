"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type DishCardImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={
        className ??
        "from-muted via-muted/80 to-muted/50 h-44 w-full bg-gradient-to-br sm:h-52"
      }
      aria-hidden
    />
  );
}

export function DishCardImage({ src, alt, className }: DishCardImageProps) {
  const primary = src?.trim() ? src.trim() : null;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [primary]);

  if (!primary || failed) {
    return <ImagePlaceholder className={className} />;
  }

  return (
    <div className="bg-muted relative h-44 w-full overflow-hidden sm:h-52">
      {!loaded ? (
        <div
          className="from-muted via-background/40 to-muted absolute inset-0 animate-pulse bg-gradient-to-br"
          aria-hidden
        />
      ) : null}
      <Image
        key={primary}
        src={primary}
        alt={alt}
        fill
        unoptimized
        sizes="(max-width: 32rem) 100vw, 512px"
        className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setFailed(true);
        }}
      />
    </div>
  );
}
