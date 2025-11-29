export interface ScriptConfig {
  src?: string;
  content?: string;
  type?: string;
}

export const loadScripts = async (
  scripts: (string | ScriptConfig)[],
  onProgress: (progress: number) => void
): Promise<void> => {
  let loadedCount = 0;
  const total = scripts.length;

  // Fake initial progress
  onProgress(10);

  for (const scriptDef of scripts) {
    const src = typeof scriptDef === 'string' ? scriptDef : scriptDef.src;
    const content = typeof scriptDef === 'string' ? undefined : scriptDef.content;
    const type = typeof scriptDef === 'string' ? 'text/javascript' : (scriptDef.type || 'text/javascript');

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.type = type;

      if (src) {
        script.src = src;
        script.onload = () => {
          loadedCount++;
          onProgress(10 + (loadedCount / total) * 80);
          resolve();
        };
        script.onerror = (e) => {
          console.error("Script load error:", src, e);
          reject(new Error(`Failed to load script: ${src}`));
        };
      } else if (content) {
        script.textContent = content;
        document.body.appendChild(script);
        // Inline scripts execute immediately
        loadedCount++;
        onProgress(10 + (loadedCount / total) * 80);
        resolve();
        return; // Already appended
      }

      document.body.appendChild(script);
    });
  }

  onProgress(100);
};