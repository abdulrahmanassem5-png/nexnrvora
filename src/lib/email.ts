import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export interface EmailParams {
  to_email: string;
  to_name: string;
  from_name: string;
  message: string;
  subject?: string;
  action_url?: string;
}

export const sendEmailNotification = async (params: EmailParams) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn("EmailJS is not configured. Skipping email notification.");
    return false;
  }

  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        ...params,
        // Fallback subject if not provided
        subject: params.subject || 'لديك إشعار جديد من NEXNRVORA',
      },
      PUBLIC_KEY
    );
    console.log("Email sent successfully", response.status, response.text);
    return true;
  } catch (error) {
    console.error("Failed to send email", error);
    return false;
  }
};
