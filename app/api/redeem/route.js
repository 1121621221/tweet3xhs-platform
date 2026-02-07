import { supabase } from '@/app/lib/supabaseClient'
export async function POST(request) {
  try {
    const { cardKey } = await request.json()
    if (!cardKey) {
      return Response.json({ error: '卡密不能为空' }, { status: 400 })
    }
    // 1. 获取当前登录用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '用户未登录' }, { status: 401 })
    }
    // 2. 【关键】验证卡密！这里预设了两个测试卡密，你需要改成自己的
    const validKeys = {
      'VIP2025ABCD': { type: 'vip', quota: 100 },
      'NORMAL12345': { type: 'normal', quota: 10 },
    }
    const cardInfo = validKeys[cardKey]
    if (!cardInfo) {
      return Response.json({ error: '卡密无效或已过期' }, { status: 400 })
    }
    // 3. 更新用户资料
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        membership_type: cardInfo.type === 'vip' ? 'vip' : 'free',
        quota: cardInfo.quota,
        card_key: cardKey
      })
    if (updateError) {
      console.error('更新用户资料失败:', updateError)
      return Response.json({ error: '更新失败' }, { status: 500 })
    }
    // 4. 返回成功
    return Response.json({
      success: true,
      message: `卡密兑换成功！您已获得 ${cardInfo.quota} 次额度。`
    })
  } catch (error) {
    console.error('兑换API错误:', error)
    return Response.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
