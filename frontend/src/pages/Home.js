import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Welcome to Survey Server with AI</h1>
        <p>
          Share your opinions in free text and get AI-powered summaries and insights.
          Create surveys, collect responses, and discover patterns with advanced AI analysis.
        </p>
        
        {!user ? (
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
          </div>
        ) : (
          <div className="cta-buttons">
            <Link to="/surveys" className="btn btn-primary">
              Browse Surveys
            </Link>
            <Link to="/create-survey" className="btn btn-secondary">
              Create Survey
            </Link>
          </div>
        )}
      </section>

      <section className="features">
        <h2>Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>AI-Powered Summaries</h3>
            <p>Get intelligent summaries of all responses using advanced AI technology.</p>
          </div>
          <div className="feature-card">
            <h3>Natural Language Search</h3>
            <p>Find surveys using natural language queries powered by AI.</p>
          </div>
          <div className="feature-card">
            <h3>Response Validation</h3>
            <p>Ensure responses meet your survey guidelines with AI validation.</p>
          </div>
          <div className="feature-card">
            <h3>Free Text Responses</h3>
            <p>Collect rich, detailed opinions in free text format.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 