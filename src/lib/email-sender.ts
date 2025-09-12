
'use server'

import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import nodemailer from 'nodemailer';

// Configure the Nodemailer transporter using Google SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nsxorasystems@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD, // Use environment variable for security
    },
});

/**
 * NOTE: This function can be called to process the email queue.
 * In a production environment, you might set up a cron job or a
 * recurring task to call this function periodically.
 */
export async function processEmailQueue() {
    console.log("Checking for queued emails...");
    const q = query(collection(db, "queuedEmails"), where("status", "==", "queued"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log("No queued emails to send.");
        return { success: true, message: "No emails in queue." };
    }

    const batch = writeBatch(db);
    let sentCount = 0;
    let failedCount = 0;

    const emailPromises = querySnapshot.docs.map(async (docSnap) => {
        const emailData = docSnap.data();
        const mailOptions = {
            from: '"CampusFlow" <campusflow@system.com>', // Use a valid from address
            replyTo: 'nsxorasystems@gmail.com', // Ensure replies go to the correct address
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to: ${emailData.to}`);
            batch.update(docSnap.ref, { status: "sent", sentAt: new Date().toISOString() });
            sentCount++;
        } catch (error) {
            console.error(`Failed to send email to ${emailData.to}:`, error);
            batch.update(docSnap.ref, { status: "failed", error: (error as Error).message });
            failedCount++;
        }
    });

    await Promise.all(emailPromises);

    try {
        await batch.commit();
        const message = `Processed ${querySnapshot.size} emails. Sent: ${sentCount}, Failed: ${failedCount}.`;
        console.log(message);
        return { success: true, message };
    } catch (error) {
        console.error("Error updating email statuses:", error);
        return { success: false, message: "Error updating email statuses in Firestore." };
    }
}
