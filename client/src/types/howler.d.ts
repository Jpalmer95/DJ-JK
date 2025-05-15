declare module 'howler' {
  export class Howl {
    constructor(options: {
      src: string[];
      volume?: number;
      preload?: boolean;
      loop?: boolean;
      autoplay?: boolean;
      html5?: boolean;
      format?: string[];
      onend?: () => void;
      onload?: () => void;
      onloaderror?: (id: number, error: any) => void;
      onplay?: () => void;
      onpause?: () => void;
      onstop?: () => void;
      onmute?: () => void;
      onvolume?: () => void;
      onrate?: () => void;
      onseek?: () => void;
      onfade?: () => void;
    });

    play(spriteOrId?: string | number): number;
    pause(id?: number): this;
    stop(id?: number): this;
    mute(muted?: boolean, id?: number): this;
    volume(vol?: number, id?: number): this | number;
    fade(from: number, to: number, duration: number, id?: number): this;
    rate(rate?: number, id?: number): this | number;
    seek(seek?: number, id?: number): this | number;
    loop(loop?: boolean, id?: number): this | boolean;
    state(): 'unloaded' | 'loading' | 'loaded';
    playing(id?: number): boolean;
    duration(id?: number): number;
    on(event: string, fn: Function, id?: number): this;
    once(event: string, fn: Function, id?: number): this;
    off(event: string, fn?: Function, id?: number): this;
    load(): this;
    unload(): void;
  }

  export class Howler {
    static volume(vol?: number): number | Howler;
    static mute(muted?: boolean): boolean | Howler;
    static stop(): void;
    static codecs(ext: string): boolean;
    static unload(): void;
    static usingWebAudio: boolean;
    static noAudio: boolean;
    static masterGain: GainNode;
    static autoSuspend: boolean;
    static ctx: AudioContext;
    static mobileAutoEnable: boolean;
  }
}