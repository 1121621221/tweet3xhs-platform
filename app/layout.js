import './globals.css'
export const metadata = {
  title: 'AI推文转小红书平台',
  description: '一键将推特链接转换为小红书文案',
}
export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
