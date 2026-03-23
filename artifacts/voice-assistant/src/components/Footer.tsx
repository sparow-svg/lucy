const MENUS = [
  {
    title: "Voice AI Assistant",
    links: ["Overview", "Features", "Languages"],
  },
  {
    title: "Speak with AI",
    links: [
      "AI Voice Assistant",
      "Talk to AI Online",
      "Voice AI for Productivity",
      "Hands-Free AI Chat",
    ],
  },
  {
    title: "About Lucy",
    links: ["About", "Blog", "Contact", "How it Works", "FAQ"],
  },
  {
    title: "Privacy & Legal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Legal Notice"],
  },
];

const AppleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.182 0c.07 0 .141.003.21.01C11.14 1.39 10.6 2.64 9.77 3.59 8.97 4.54 7.9 5.16 6.7 5.11c-.04-.38-.06-.77-.06-1.16 0-2.2 1.1-3.95 4.54-3.95zm-4.91 5.34c1.37.04 2.67-.68 3.6-1.81.94-1.12 1.47-2.6 1.33-4.18 1.38.15 2.57.88 3.43 1.96.87 1.1 1.35 2.52 1.35 3.97 0 1.15-.24 2.24-.7 3.21-.46.97-1.11 1.82-1.91 2.47-.8.64-1.72 1-2.66 1-.78 0-1.49-.26-2.13-.7-.53-.36-1.02-.55-1.55-.55-.52 0-1.01.19-1.53.55-.64.44-1.37.7-2.13.7-.93 0-1.86-.36-2.66-1-.8-.65-1.45-1.5-1.91-2.47C.24 7.57 0 6.48 0 5.33c0-2.53 1.28-4.62 3.23-5.22-.13.41-.2.84-.2 1.27 0 1.97 1.05 3.78 2.69 4.96h.59z"/>
  </svg>
);

const WebIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M7.5 1C7.5 1 5 4 5 7.5S7.5 14 7.5 14" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M7.5 1C7.5 1 10 4 10 7.5S7.5 14 7.5 14" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M1 7.5H14" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);

export function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        backgroundColor: "#fff",
        borderTop: "1px solid #ebebeb",
        padding: "56px 5% 32px",
        boxSizing: "border-box",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Download & Access row */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto 48px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, color: "#555", marginRight: 4 }}>
          Get Lucy on your device:
        </span>

        {/* Mac download button */}
        <a
          href="/lucy-desktop.dmg"
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            backgroundColor: "#1a1a1a",
            color: "#fff",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#333")}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#1a1a1a")}
        >
          <AppleIcon />
          Download for Mac
        </a>

        {/* Web app link */}
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            backgroundColor: "transparent",
            color: "#1a1a1a",
            border: "1.5px solid #ddd",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#aaa")}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#ddd")}
        >
          <WebIcon />
          Open Web App
        </a>
      </div>

      {/* Four-column menu grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "40px 32px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {MENUS.map((menu) => (
          <div key={menu.title}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: "#1a1a1a",
                margin: "0 0 16px 0",
              }}
            >
              {menu.title}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {menu.links.map((link) => (
                <li key={link} style={{ marginBottom: 10 }}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    style={{
                      fontSize: 13,
                      color: "#6b6b6b",
                      textDecoration: "none",
                      lineHeight: 1.5,
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "#1a1a1a")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "#6b6b6b")
                    }
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: 1100,
          margin: "48px auto 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          paddingTop: 24,
          borderTop: "1px solid #ebebeb",
        }}
      >
        <span style={{ fontSize: 12, color: "#9b9b9b" }}>
          © 2026 Lucy AI Switzerland. All rights reserved.
        </span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-label="LinkedIn"
            style={{ color: "#9b9b9b", textDecoration: "none", fontSize: 12 }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#1a1a1a")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#9b9b9b")
            }
          >
            LinkedIn
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-label="X (Twitter)"
            style={{ color: "#9b9b9b", textDecoration: "none", fontSize: 12 }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#1a1a1a")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#9b9b9b")
            }
          >
            X (Twitter)
          </a>
        </div>
      </div>
    </footer>
  );
}
