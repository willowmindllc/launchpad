import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{
        title: "LaunchPad",
        url: "/",
      }}
      links={[
        { text: "Docs", url: "/docs" },
        {
          text: "GitHub",
          url: "https://github.com/willowmindllc/launchpad",
          external: true,
        },
      ]}
      githubUrl="https://github.com/willowmindllc/launchpad"
    >
      {children}
    </HomeLayout>
  );
}
