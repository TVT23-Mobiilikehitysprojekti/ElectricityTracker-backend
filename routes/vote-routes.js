const express = require('express');
const router = express.Router();
const { firestore } = require('../firebase/config');
const { doc, getDoc, setDoc, updateDoc } = require("firebase/firestore");



// Upvote route
router.post('/upvote', async (req, res) => {
    const { userId, newsId } = req.body;

    try {
        const voteRef = doc(firestore, 'votes', `${userId}_${newsId}`);
        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
            // Update existing vote to upvote
            await updateDoc(voteRef, { voteType: 1 });
            return res.status(200).json({ message: 'Vote updated to upvote' });
        } else {
            // Create a new vote record with the id field
            await setDoc(voteRef, { id: `${userId}_${newsId}`, userId, newsId, voteType: 1 });
            return res.status(201).json({ message: 'Upvote recorded' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred', details: error.message });
    }
});

// Downvote route
router.post('/downvote', async (req, res) => {
    const { userId, newsId } = req.body;

    try {
        const voteRef = doc(firestore, 'votes', `${userId}_${newsId}`);
        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
            // Update existing vote to downvote
            await updateDoc(voteRef, { voteType: -1 });
            return res.status(200).json({ message: 'Vote updated to downvote' });
        } else {
            // Create a new vote record with the id field
            await setDoc(voteRef, { id: `${userId}_${newsId}`, userId, newsId, voteType: -1 });
            return res.status(201).json({ message: 'Downvote recorded' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred', details: error.message });
    }
});

// Route to fetch votes for an item
router.get('/votes', async (req, res) => {
    const { itemId } = req.query;

    try {
        const votesQuery = query(
            collection(firestore, 'votes'),
            where('newsId', '==', itemId)
        );
        const querySnapshot = await getDoc(votesQuery);

        const votes = querySnapshot.docs.map(doc => doc.data());
        return res.status(200).json(votes);
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while fetching votes', details: error.message });
    }
});

// Route to fetch user's vote for an item
router.get('/user-vote', async (req, res) => {
    const { userId, itemId } = req.query;

    try {
        const voteRef = doc(firestore, 'votes', `${userId}_${itemId}`);
        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
            return res.status(200).json({ id: voteDoc.id, vote_type: voteDoc.data().voteType });
        } else {
            return res.status(404).json({ message: 'Vote not found' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while fetching user vote', details: error.message });
    }
});

module.exports = router;