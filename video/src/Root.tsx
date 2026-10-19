import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { Lab } from "./Lab";
import { Thumbnail } from "./Thumbnail";
import timings from "./data/timings.json";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={1}
      calculateMetadata={async () => ({ durationInFrames: timings.totalFrames })}
    />
    <Composition id="Thumbnail" component={Thumbnail} width={1280} height={720} fps={30} durationInFrames={1} />
    <Composition id="Lab" component={Lab} width={1920} height={1080} fps={30} durationInFrames={30} />
  </>
);
