const MENUS = [
  {
    title: "Voice AI Assistant",
    links: ["Overview", "Features", "Supported Platforms", "Languages"],
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
                marginBottom: 16,
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
        {/* Social icons placeholder */}
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
