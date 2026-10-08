import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "HEAT · 联机赛车俱乐部",
  description:
    "换挡、选牌、管理热量。创建房间，邀请朋友，开始一场中文多人在线赛车。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
