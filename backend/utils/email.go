package utils

import (
	"crypto/tls"
	"fmt"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"
)

// SendEmail sends an email using gomail
func SendEmail(to, subject, body string) error {
	// Get email configuration from environment variables
	from := os.Getenv("EMAIL_FROM")
	password := os.Getenv("EMAIL_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	// Convert port to int
	port, _ := strconv.Atoi(smtpPort)

	// Create a new message
	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	// Create a new dialer
	d := gomail.NewDialer(smtpHost, port, from, password)

	// This is the important line for TLS issues
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	// Send the email
	return d.DialAndSend(m)
}

// SendPasswordResetEmail sends a password reset email
func SendPasswordResetEmail(to, resetURL string) error {
	subject := "Password Reset Request"

	// HTML email body
	body := fmt.Sprintf(`
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>You recently requested to reset your password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="%s" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                </div>
                <p>This link will expire in 20 minutes for security reasons.</p>
                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">This is an automated email. Please do not reply to this message.</p>
            </div>
        </body>
    </html>
    `, resetURL)

	return SendEmail(to, subject, body)
}
