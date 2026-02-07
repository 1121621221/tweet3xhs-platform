'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
export default function HomePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [twitterLink, setTwitterLink] = useState('')
  const [cardKey, setCardKey] = useState('')
  const [apiMessage, setApiMessage] = useState('')
  // 1. 检查登录状态并获取用户资料
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('membership_type, quota')
          .eq('id', data.user.id)
          .single()
        setProfile(profileData || { membership_type: 'free', quota: 0 })
      }
      setLoading(false)
    })
  }, [])
  // 2. 邮箱登录/注册函数
  const handleLogin = async () => {
    const email = prompt('请输入您的邮箱以登录/注册:')
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    alert(error ? '错误: ' + error.message : '登录链接已发送到您的邮箱！')
  }
  // 3. 登出
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }
  // 4. 兑换卡密
  const handleRedeem = async () => {
    if (!cardKey.trim()) return alert('请输入卡密')
    setApiMessage('兑换中...')
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardKey })
    })
    const result = await res.json()
    setApiMessage(result.message || result.error)
    if (res.ok) {
      setCardKey('')
      // 重新获取资料
      const { data } = await supabase
        .from('profiles')
        .select('membership_type, quota')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
  }
  // 5. 提交推特链接进行转换
  const handleConvert = async () => {
    if (!twitterLink.trim()) return alert('请输入推特链接')
    if (profile?.quota <= 0) return alert('次数不足，请兑换卡密')
    setApiMessage('AI转换中...')
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twitterLink })
    })
    const result = await res.json()
    setApiMessage(result.message || result.error || (result.success ? '转换成功！' : '转换失败'))
    if (res.ok) {
      setTwitterLink('')
      // 更新本地次数
      setProfile({ ...profile, quota: profile.quota - 1 })
    }
  }
  if (loading) return <div>加载中...</div>
  return (
    <div>
      <h1>🚀 AI推文转小红书平台</h1>
      {user ? (
        <>
          <div className="card">
            <p>👤 欢迎, <strong>{user.email}</strong>!</p>
            <p>🎫 会员状态: <strong>{profile?.membership_type === 'vip' ? 'VIP会员' : '免费用户'}</strong></p>
            <p>✨ 剩余次数: <strong>{profile?.quota || 0}</strong> 次</p>
            <button onClick={handleLogout}>退出登录</button>
          </div>
          <div className="card">
            <h3>💳 兑换卡密 (开通会员/增加次数)</h3>
            <p>请在此输入您购买的卡密：</p>
            <input type="text" placeholder="请输入卡密" value={cardKey} onChange={e => setCardKey(e.target.value)} />
            <button onClick={handleRedeem}>立即兑换</button>
          </div>
          <div className="card">
            <h3>🔗 提交推特链接进行转换</h3>
            <input type="text" placeholder="粘贴推特链接在这里..." value={twitterLink} onChange={e => setTwitterLink(e.target.value)} style={{ width: '70%' }} />
            <button onClick={handleConvert} disabled={!profile?.quota}>开始AI转换</button>
            <p><small>每次转换将消耗1次额度。</small></p>
          </div>
        </>
      ) : (
        <div className="card">
          <h3>🔐 请先登录</h3>
          <p>登录后即可使用AI转换与卡密兑换功能。</p>
          <button onClick={handleLogin}>点击这里登录/注册</button>
        </div>
      )}
      {apiMessage && <div className="card"><p><strong>系统消息:</strong> {apiMessage}</p></div>}
    </div>
  )
}
