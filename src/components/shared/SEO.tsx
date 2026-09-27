import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
}

export const SEO: React.FC<SEOProps> = ({ 
  title = 'NEXNRVORA - منصة العمل الحر الاحترافية', 
  description = 'انضم إلى NEXNRVORA، المنصة الرائدة للعمل الحر. اربط بين أفضل المستقلين وأصحاب المشاريع عالمياً بميزات احترافية مثل العقود الذكية والذكاء الاصطناعي.', 
  keywords = 'عمل حر, فريلانسر, برمجة, تصميم, تسويق, NEXNRVORA, منصة عمل, مستقلين, عقود ذكية',
  ogImage = '/og-image.jpg',
  ogUrl = 'https://nexnrvora.com'
}) => {
  const fullTitle = title.includes('NEXNRVORA') ? title : `${title} | NEXNRVORA`;

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={ogUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
      
      {/* Theme Color for mobile browsers */}
      <meta name="theme-color" content="#0F172A" />
      
      {/* Canonical URL to prevent duplicate content issues */}
      <link rel="canonical" href={ogUrl} />
    </Helmet>
  );
};
