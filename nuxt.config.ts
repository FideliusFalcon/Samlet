export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },

  app: {
    head: {
      htmlAttrs: { lang: 'da' },
    },
  },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://samlet:secretpassword@localhost:5432/samlet',
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@samlet.local',
    adminPassword: process.env.ADMIN_PASSWORD || 'herervisamlet',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || 'noreply@samlet.local',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    webauthnRpId: process.env.WEBAUTHN_RP_ID || 'localhost',
    webauthnOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
    webhookUrl: process.env.WEBHOOK_URL || '',
    backupDir: process.env.BACKUP_DIR || './backups',
    public: {
      appName: process.env.APP_NAME || 'Samlet',
      smtpEnabled: false, // override at runtime via NUXT_PUBLIC_SMTP_ENABLED=true
    },
  },
})
