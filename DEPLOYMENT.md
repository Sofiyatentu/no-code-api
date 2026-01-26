# NoCodeAPI - Deployment Guide

## Backend Deployment (Heroku, Railway, or similar)

### Environment Variables
\`\`\`
MONGODB_URI=<production-mongodb-uri>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRE=7d
FRONTEND_URL=<production-frontend-url>
PORT=5000
API_GATEWAY_URL=<production-backend-url>
NODE_ENV=production
\`\`\`

### Heroku Deployment
\`\`\`bash
heroku create api-builder-backend
heroku config:set MONGODB_URI=<your-mongodb-uri>
heroku config:set JWT_SECRET=<your-secret>
git push heroku main
\`\`\`

## Frontend Deployment (Vercel, Netlify)

### Vercel
\`\`\`bash
npm i -g vercel
vercel env add VITE_API_URL <backend-url>
vercel --prod
\`\`\`

### Netlify
\`\`\`bash
npm run build
netlify deploy --prod --dir=dist
\`\`\`

## Production Checklist

- [ ] Change JWT_SECRET to random string
- [ ] Set NODE_ENV=production
- [ ] Use production MongoDB
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up monitoring and alerting
- [ ] Enable database backups
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Configure CDN for frontend assets
