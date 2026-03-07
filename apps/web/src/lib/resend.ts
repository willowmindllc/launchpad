import { Resend } from 'resend'

// Key is required at runtime but may be absent during CI build.
// Resend constructor accepts any string; calls will fail gracefully
// in sendInviteEmail's catch block if the key is invalid.
export const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
