'use client';

const providerNodes = [
  {
    name: 'OpenAI',
    shortName: 'OA',
    position: 'top-[10%] left-[10%]',
    tone: 'bg-[#10a37f]/12 text-[#10a37f] border-[#10a37f]/20',
    delay: '0.2s',
  },
  {
    name: 'Anthropic',
    shortName: 'AN',
    position: 'top-[15%] right-[10%]',
    tone: 'bg-[#8b5cf6]/12 text-[#8b5cf6] border-[#8b5cf6]/20',
    delay: '1s',
  },
  {
    name: 'Gemini',
    shortName: 'GM',
    position: 'bottom-[15%] left-[15%]',
    tone: 'bg-[#4285f4]/12 text-[#4285f4] border-[#4285f4]/20',
    delay: '1.5s',
  },
  {
    name: 'DeepSeek',
    shortName: 'DS',
    position: 'bottom-[15%] right-[15%]',
    tone: 'bg-primary/12 text-primary border-primary/20',
    delay: '0.8s',
  },
];

export default function ProviderOrbit() {
  return (
    <div className="relative w-full aspect-square max-h-[450px]">
      <div className="absolute left-1/2 top-1/2 z-20 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-border bg-white shadow-xl sm:h-32 sm:w-32">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
          <i className="fas fa-network-wired" />
        </div>
        <span className="text-xs font-bold text-text-primary sm:text-sm">MeshRouter</span>
      </div>

      <svg
        className="absolute inset-0 z-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          id="provider-orbit-path-openai"
          d="M 50 50 L 18 18"
          stroke="#cbd5e1"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          fill="none"
        />
        <path
          id="provider-orbit-path-anthropic"
          d="M 50 50 L 82 23"
          stroke="#cbd5e1"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          fill="none"
        />
        <path
          id="provider-orbit-path-gemini"
          d="M 50 50 L 23 77"
          stroke="#cbd5e1"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          fill="none"
        />
        <path
          id="provider-orbit-path-deepseek"
          d="M 50 50 L 77 77"
          stroke="#cbd5e1"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          fill="none"
        />

        <circle r="1.1" fill="#215d59" opacity="0.95">
          <animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto">
            <mpath href="#provider-orbit-path-openai" />
          </animateMotion>
        </circle>
        <circle r="0.95" fill="#215d59" opacity="0.85">
          <animateMotion dur="4.4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#provider-orbit-path-anthropic" />
          </animateMotion>
        </circle>
        <circle r="1.1" fill="#a94b2b" opacity="0.95">
          <animateMotion dur="3.8s" repeatCount="indefinite" rotate="auto">
            <mpath href="#provider-orbit-path-gemini" />
          </animateMotion>
        </circle>
        <circle r="0.95" fill="#a94b2b" opacity="0.85">
          <animateMotion dur="4.8s" repeatCount="indefinite" rotate="auto">
            <mpath href="#provider-orbit-path-deepseek" />
          </animateMotion>
        </circle>
      </svg>

      {providerNodes.map((node) => (
        <div
          key={node.name}
          className={`absolute ${node.position} z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white shadow-lg sm:h-20 sm:w-20`}
          style={{ animationDelay: node.delay }}
        >
          <div className="text-center">
            <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold tracking-[0.14em] sm:h-10 sm:w-10 sm:text-xs ${node.tone}`}>
              {node.shortName}
            </div>
            <div className="text-[9px] font-semibold text-text-secondary sm:text-[10px]">{node.name}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
