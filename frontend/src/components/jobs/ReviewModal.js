// frontend/src/components/jobs/ReviewModal.js
import React, { useState, useEffect } from 'react';
import './ReviewModal.css';

const ReviewModal = ({ isOpen, onClose, onSubmit, jobId, revieweeId, revieweeName, hasReviewed }) => {
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setRating(5);
            setReview('');
            setHoverRating(0);
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (hasReviewed) {
            setError('You have already reviewed this job');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await onSubmit({
                jobId,
                rating,
                review,
                revieweeId
            });
            onClose();
        } catch (error) {
            setError(error.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="review-modal-overlay" onClick={onClose}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                <button className="review-modal-close" onClick={onClose}>×</button>
                
                <h2>Leave a Review</h2>
                <p className="review-subtitle">How was your experience with {revieweeName || 'the worker'}?</p>

                {error && (
                    <div className="review-error">
                        ⚠️ {error}
                    </div>
                )}

                {hasReviewed ? (
                    <div className="already-reviewed">
                        <span className="reviewed-icon">✅</span>
                        <h3>You've already reviewed this job</h3>
                        <p>Thank you for your feedback!</p>
                        <button className="review-btn-close" onClick={onClose}>
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="rating-container">
                            <div className="rating-stars-large">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`star-large ${(hoverRating || rating) >= star ? 'active' : ''}`}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <div className="rating-label">
                                {rating === 1 && 'Poor'}
                                {rating === 2 && 'Fair'}
                                {rating === 3 && 'Good'}
                                {rating === 4 && 'Very Good'}
                                {rating === 5 && 'Excellent'}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="review">Your Review (Optional)</label>
                            <textarea
                                id="review"
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                placeholder="Share your experience... What went well? What could be improved?"
                                rows="4"
                            />
                        </div>

                        <div className="review-modal-actions">
                            <button 
                                type="button" 
                                className="review-btn-cancel"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="review-btn-submit"
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ReviewModal;