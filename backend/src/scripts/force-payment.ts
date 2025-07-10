import { sessionService } from '../services/sessionService';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

dotenv.config();

const forcePayment = async (sessionId: string) => {
  if (!sessionId) {
    logger.error('Session ID is required.');
    process.exit(1);
  }

  try {
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      logger.error(`Session with ID ${sessionId} not found.`);
      return;
    }

    if (session.isPaid) {
        logger.warn(`Session ${sessionId} is already marked as paid.`);
        return;
    }

    logger.info(`Forcing payment for session: ${sessionId}`);

    const downloadToken = nanoid(32);
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const downloadUrl = `${backendUrl}/api/export/download/${downloadToken}`;

    const updatedSession = await sessionService.updateSession(sessionId, {
      isPaid: true,
      downloadUrl,
      downloadToken,
    });

    if (updatedSession) {
      logger.info(`Session ${sessionId} successfully marked as paid.`);
      logger.info(`Download URL: ${downloadUrl}`);
      console.log('Session updated successfully:', updatedSession);
    } else {
      logger.error(`Failed to update session ${sessionId}.`);
    }

  } catch (error) {
    logger.error('An error occurred while forcing payment:', error);
  } finally {
    process.exit(0);
  }
};

// Get session ID from command line arguments
const sessionIdFromArgs = process.argv[2];
forcePayment(sessionIdFromArgs);
