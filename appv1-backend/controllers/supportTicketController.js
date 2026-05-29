const SupportTicket = require('../models/SupportTicket');
const { uploadToAzure, sharp } = require('../config/azureStorage');
const { randomUUID } = require('crypto');

const generateTicketId = () => `TKT_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

exports.createTicket = async (req, res) => {
  try {
    const { email, phoneNumber, description } = req.body;
    
    // We assume the user is authenticated via the auth middleware
    const userId = req.user?.studentId || req.user?.teacherId || req.user?.adminId || req.user?.userId;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!userId || !orgId) {
      return res.status(400).json({ error: 'User must be authenticated and associated with an organization' });
    }

    if (!email || !phoneNumber || !description) {
      return res.status(400).json({ error: 'email, phoneNumber, and description are required' });
    }

    const imageUrls = [];

    // If there are files attached, process and upload them to Azure
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isImageMime = file.mimetype.startsWith('image/');
        const hasImageExt = file.originalname.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i);

        // Ensure it's an image
        if (!isImageMime && !hasImageExt) {
          return res.status(400).json({ error: `Only image files are allowed as attachments. Received: ${file.mimetype} for ${file.originalname}` });
        }

        // Optimize image using Sharp
        const optimizedBuffer = await sharp(file.buffer)
          .resize({ width: 1000, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const originalName = file.originalname.replace(/\.[^/.]+$/, "") + ".webp";

        // Upload to Azure in the 'support' folder
        const uploadResult = await uploadToAzure(
          optimizedBuffer,
          originalName,
          'image/webp',
          'support'
        );

        imageUrls.push(uploadResult.url);
      }
    }

    // Generate unique Ticket ID
    let ticketId = generateTicketId();
    while (await SupportTicket.findOne({ ticketId })) {
      ticketId = generateTicketId();
    }

    const ticket = await SupportTicket.create({
      ticketId,
      userId,
      orgId,
      email,
      phoneNumber,
      description,
      images: imageUrls,
      status: 'Open'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Support ticket submitted successfully', 
      ticket 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.orgId;
    const userId = req.user?.studentId || req.user?.teacherId || req.user?.adminId || req.user?.userId;
    const { all } = req.query; // If admin wants to see all tickets for the org

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    let filter = { orgId };

    // Unless 'all=true' is passed, only show tickets for the logged in user
    if (all !== 'true') {
      if (!userId) {
         return res.status(400).json({ error: 'userId is missing from token' });
      }
      filter.userId = userId;
    }

    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
