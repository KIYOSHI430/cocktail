/**
 * 云函数：发送短信验证码（腾讯云短信）
 *
 * 现在网站注册页的验证码是「演示模式」——直接显示在页面上，方便先跑通流程。
 * 部署好这个云函数、把地址填到后台「站点设置 → 短信云函数地址」之后，
 * 验证码就会变成真实发送到手机上。
 *
 * 需要配置的环境变量（都在腾讯云控制台里拿）：
 *   TENCENT_SECRET_ID    腾讯云 API 密钥 SecretId
 *   TENCENT_SECRET_KEY   腾讯云 API 密钥 SecretKey
 *   SMS_SDK_APP_ID       短信应用的 SDKAppID（短信控制台 → 应用管理）
 *   SMS_SIGN_NAME        已审核通过的短信签名，例如「鸡尾酒法典」
 *   SMS_TEMPLATE_ID      已审核通过的正文模板 ID，模板内容例如：
 *                        「您的验证码是{1}，{2}分钟内有效，请勿泄露给他人。」
 *
 * 注意：短信签名和模板都需要腾讯云审核（个人可申请，一般 1-2 个工作日）。
 * 安全提示：SecretKey 只能存在这里的环境变量里，绝不能写进网页代码。
 */

const tencentcloud = require("tencentcloud-sdk-nodejs-sms");

const SmsClient = tencentcloud.sms.v20210111.Client;

const client = new SmsClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID || "",
    secretKey: process.env.TENCENT_SECRET_KEY || ""
  },
  region: "ap-guangzhou",
  profile: { httpProfile: { endpoint: "sms.tencentcloudapi.com" } }
});

exports.main = async (event) => {
  let body = event || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (body.body) {
    try { body = typeof body.body === "string" ? JSON.parse(body.body) : body.body; } catch (e) { /* 忽略 */ }
  }

  const phone = String(body.phone || "").trim();
  const code = String(body.code || "").trim();
  const minutes = String(body.minutes || 10);

  if (!/^1[3-9]\d{9}$/.test(phone)) return { ok: false, msg: "手机号格式不对" };
  if (!/^\d{4,6}$/.test(code)) return { ok: false, msg: "验证码格式不对" };
  if (!process.env.TENCENT_SECRET_ID || !process.env.SMS_SDK_APP_ID) {
    return { ok: false, msg: "云函数还没配置短信相关的环境变量" };
  }

  try {
    const res = await client.SendSms({
      PhoneNumberSet: ["+86" + phone],
      SmsSdkAppId: process.env.SMS_SDK_APP_ID,
      SignName: process.env.SMS_SIGN_NAME,
      TemplateId: process.env.SMS_TEMPLATE_ID,
      TemplateParamSet: [code, minutes]
    });
    const status = res.SendStatusSet && res.SendStatusSet[0];
    if (status && status.Code === "Ok") return { ok: true, msg: "已发送" };
    return { ok: false, msg: (status && status.Message) || "发送失败" };
  } catch (e) {
    return { ok: false, msg: "发送异常：" + e.message };
  }
};
