# OCR Provider Setup Guide

## ❌ These DON'T Need API Keys

The following providers are **self-hosted services** that don't use API keys:

### 1. **Dots.OCR** ❌ Missing
- **Type**: Self-hosted service
- **Needs**: Service URL (not API key)
- **Environment Variable**: `DOTS_OCR_SERVICE_URL`
- **Status**: Currently not configured
- **How to Set Up**: Deploy Dots.OCR service and configure URL

### 2. **PaddleOCR** ❌ Missing  
- **Type**: Self-hosted service
- **Needs**: Service URL (not API key)
- **Environment Variable**: `PADDLE_OCR_SERVICE_URL`
- **Status**: Currently not configured
- **How to Set Up**: Deploy PaddleOCR service and configure URL

### 3. **DeepSeek OCR** ❌ Missing
- **Type**: Self-hosted FastAPI service
- **Needs**: Service URL (not API key)
- **Environment Variable**: `DEEPSEEK_OCR_SERVICE_URL`
- **Status**: Currently not configured
- **How to Set Up**: 
  - We already have the code in `services/deepseek-ocr-service/`
  - Deploy it to a cloud instance with GPU
  - Set `DEEPSEEK_OCR_SERVICE_URL` environment variable

---

## ✅ Providers That DO Need API Keys

### Already Configured (6):
1. **OpenAI API** ✅ 
   - `OPENAI_API_KEY`
2. **Anthropic** ✅
   - `ANTHROPIC_API_KEY`
3. **Mistral AI** ✅
   - `MISTRAL_API_KEY`
4. **Google Vision** ✅
   - `GOOGLE_VISION_API_KEY`
5. **OCR.space** ✅
   - `OCR_SPACE_API_KEY`

---

## 🎯 Summary

**The 3 "Missing" providers are self-hosted services, not API-key services!**

To use them:
1. **Don't configure API keys** (they don't use API keys)
2. **Deploy the services** to cloud infrastructure
3. **Configure service URLs** in Supabase environment variables
4. Currently: **Optional** - you can use OpenAI Vision, Google Vision, etc. instead

**Recommendation**: If you want to use them, deploy the services first, then configure the URLs. For now, you have 5 working OCR providers already configured!
