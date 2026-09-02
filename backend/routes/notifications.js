import express from 'express';
import { Op } from 'sequelize';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.id };
    if (unreadOnly === 'true') {
      where.is_read = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    res.json({
      notifications: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await notification.update({ is_read: true });

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/mark-all-read', async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await notification.destroy();

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
