import { supabase } from '../../lib/supabaseClient'
export async function POST(request) {
  try {
    const { twitterLink } = await request.json()
    // 1. 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '用户未登录' }, { status: 401 })
    }
    // 2. 获取用户资料和剩余次数
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('quota')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) {
      return Response.json({ error: '获取用户信息失败' }, { status: 500 })
    }
    if (profile.quota <= 0) {
      return Response.json({ error: '次数不足，请兑换卡密' }, { status: 400 })
    }
    // 3. 调用AI服务 (使用你的DeepSeek API密钥)
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return Response.json({ error: '服务器AI配置错误' }, { status: 500 })
    }
    const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是小红书文案专家，擅长将内容转换成受欢迎的小红书风格。使用亲切语气，添加表情符号和话题标签。' },
          { role: 'user', content: `请将以下推特链接/内容转换成小红书风格（潮流风格）：\n\n${twitterLink}` }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    })
    if (!aiResponse.ok) {
      const error = await aiResponse.text()
      return Response.json({ error: `AI服务调用失败: ${error}` }, { status: 500 })
    }
    const aiData = await aiResponse.json()
    const convertedText = aiData.choices[0]?.message?.content || '转换失败'
    // 4. 扣除一次用户次数
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ quota: profile.quota - 1 })
      .eq('id', user.id)
    if (updateError) {
      console.error('扣除次数失败:', updateError)
    }
    // 5. (可选) 保存记录到 `generation_tasks` 表
    await supabase
      .from('generation_tasks')
      .insert({
        user_id: user.id,
        twitter_link: twitterLink,
        xhs_copy: convertedText,
        status: 'completed'
      })
    // 6. 返回成功结果
    return Response.json({
      success: true,
      message: '转换成功',
      convertedText: convertedText
    })
  } catch (error) {
    console.error('转换API错误:', error)
    return Response.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
