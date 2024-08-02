const express = require('express');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// configuring nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'hotmail',
    auth: {
        user: 'orbixstudio@hotmail.com',    // sample email generated by me for testing purpose
        pass: 'vickskigoli@04',             // password, you can test by this account, , will change the password on Monday (05/08/2024)
    },
});

// local email storage
const scheduledEmails = {};

// serializing tasks
const getSerializableScheduledEmails = () => {
    return Object.values(scheduledEmails).map(email => {
        const { task, ...rest } = email;
        return rest;
    });
};

// post method to schedule the email
app.post('/schedule-email', (req, res) => {
    const { email, subject, body, scheduleTime, attachments } = req.body;

    // input validation - in case if mail is incomplete
    if (!email || !subject || !body || !scheduleTime) {
        console.log('Error in Validating the Email, All fields are required.');
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const id = uuidv4();

    try {
        const task = cron.schedule(scheduleTime, () => {
            const mailOptions = {
                from: 'orbixstudio@hotmail.com',
                to: email,
                subject: subject,
                text: body,
                attachments: attachments ? attachments.map(att => ({
                    filename: att.filename,
                    path: att.path
                })) : []
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });

            delete scheduledEmails[id];
        });

        scheduledEmails[id] = { id, email, subject, body, scheduleTime, attachments, task };
        console.log('Scheduled email:', scheduledEmails[id]);
        res.status(201).json({ message: 'Email is scheduled Successfully.', id });
    } catch (error) {
        console.log('Error in scheduling the email:', error);
        res.status(500).json({ error: 'Failed to schedule the email.' });
    }
});

// get method for all emails
app.get('/scheduled-emails', (req, res) => {
    res.status(200).json(getSerializableScheduledEmails());
});

// get method to retrieve specific email
app.get('/scheduled-emails/:id', (req, res) => {
    const { id } = req.params;
    const scheduledEmail = scheduledEmails[id];

    if (!scheduledEmail) {
        console.log(`Scheduled email with id ${id} not found.`);
        return res.status(404).json({ error: 'Email, you are trying to find does not exist.' });
    }

    const { task, ...rest } = scheduledEmail;
    res.status(200).json(rest);
});

// delete a scheduled email
app.delete('/scheduled-emails/:id', (req, res) => {
    const { id } = req.params;
    const scheduledEmail = scheduledEmails[id];

    if (!scheduledEmail) {
        console.log(`Scheduled email with id ${id} not found.`);
        return res.status(404).json({ error: 'Email, you are trying to delete does not exist.' });
    }

    scheduledEmail.task.stop();
    delete scheduledEmails[id];

    console.log(`Scheduled email with id ${id} canceled.`);
    res.status(200).json({ message: 'Scheduled Email canceled.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});