import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./AIDoctor.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function AIDoctor() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [crop, setCrop] = useState("");
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setResult(null);

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please upload a JPG, PNG, or WEBP image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image must be smaller than 5MB."
      );
      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedImage(file);
    setImagePreview(previewUrl);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!selectedImage) {
      setError(
        "Please upload a crop photo first."
      );
      return;
    }

    if (!crop) {
      setError(
        "Please select the crop type."
      );
      return;
    }

    if (!API_URL) {
      setError(
        "AI server is not configured."
      );
      return;
    }

    try {
      setAnalyzing(true);

      const formData = new FormData();

      formData.append(
        "image",
        selectedImage
      );

      formData.append(
        "crop",
        crop
      );

      formData.append(
        "description",
        description
      );

      console.log(
        "🔬 Sending crop to AgroBaz AI Doctor..."
      );

      const response = await fetch(
        `${API_URL}/ai-doctor/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to analyze the crop right now."
        );
      }

      console.log(
        "✅ AI Doctor response received"
      );

      setResult(
        data.diagnosis
      );
    } catch (err) {
      console.error(
        "❌ AI Doctor error:",
        err
      );

      if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes(
          "fetch"
        )
      ) {
        setError(
          "Could not connect to the AgroBaz AI server. Please check that the backend is running."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong while analyzing the crop."
        );
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNewAnalysis = () => {
    handleRemoveImage();
    setCrop("");
    setDescription("");
    setResult(null);
    setError("");
  };

  return (
    <div className="ai-doctor-page">

      {/* HERO */}
      <section className="ai-doctor-hero">
        <div className="ai-doctor-hero-content">

          <div className="ai-doctor-badge">
            <span>🤖</span>
            AGROBAZ AI
          </div>

          <h1>
            Your crops have a
            <span> digital doctor.</span>
          </h1>

          <p>
            Upload a clear photo of your crop and let
            AgroBaz AI analyze visible signs of
            possible crop health problems.
          </p>

          <div className="ai-doctor-hero-points">
            <span>🌱 Image Analysis</span>
            <span>🔬 Crop Health Insights</span>
            <span>📋 Practical Advice</span>
          </div>

        </div>

        <div className="ai-doctor-hero-visual">

          <div className="ai-orbit ai-orbit-one"></div>
          <div className="ai-orbit ai-orbit-two"></div>

          <div className="ai-doctor-visual-card">

            <div className="ai-visual-icon">
              🤖
            </div>

            <span>
              AGROBAZ AI DOCTOR
            </span>

            <h3>
              Smart Crop Analysis
            </h3>

            <p>
              Upload → Analyze → Learn
            </p>

            <div className="ai-visual-status">
              <span></span>
              AI SYSTEM READY
            </div>

          </div>

        </div>
      </section>

      {/* ANALYZER */}
      <section className="ai-doctor-analyzer">

        <div className="ai-doctor-section-heading">

          <span className="section-label">
            CROP HEALTH CHECK
          </span>

          <h2>
            Analyze your crop
          </h2>

          <p>
            Give the AI a clear photo and some basic
            information about your crop.
          </p>

        </div>

        <form
          className="ai-doctor-form"
          onSubmit={handleAnalyze}
        >

          {/* IMAGE */}
          <div className="ai-form-card">

            <div className="ai-form-card-header">

              <div>

                <span className="ai-step-number">
                  01
                </span>

                <h3>
                  Upload crop photo
                </h3>

                <p>
                  Use a clear JPG, PNG, or WEBP image.
                </p>

              </div>

            </div>

            {!imagePreview ? (
              <label
                className="ai-upload-area"
                htmlFor="crop-image"
              >

                <div className="ai-upload-icon">
                  📷
                </div>

                <h4>
                  Upload a crop image
                </h4>

                <p>
                  Click here to select an image
                </p>

                <small>
                  Maximum file size: 5MB
                </small>

                <input
                  ref={fileInputRef}
                  id="crop-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  hidden
                />

              </label>
            ) : (
              <div className="ai-image-preview">

                <img
                  src={imagePreview}
                  alt="Selected crop"
                />

                <button
                  type="button"
                  className="ai-remove-image"
                  onClick={handleRemoveImage}
                >
                  ✕ Remove image
                </button>

              </div>
            )}

          </div>

          {/* CROP INFORMATION */}
          <div className="ai-form-card">

            <div className="ai-form-card-header">

              <div>

                <span className="ai-step-number">
                  02
                </span>

                <h3>
                  Tell us about the crop
                </h3>

                <p>
                  This helps the AI provide a more
                  relevant assessment.
                </p>

              </div>

            </div>

            <div className="ai-form-group">

              <label htmlFor="crop">
                Crop type
              </label>

              <select
                id="crop"
                value={crop}
                onChange={(event) =>
                  setCrop(event.target.value)
                }
              >
                <option value="">
                  Select crop type
                </option>

                <option value="Maize">
                  🌽 Maize
                </option>

                <option value="Tomato">
                  🍅 Tomato
                </option>

                <option value="Cassava">
                  🌱 Cassava
                </option>

                <option value="Beans">
                  🫘 Beans
                </option>

                <option value="Banana">
                  🍌 Banana
                </option>

                <option value="Rice">
                  🌾 Rice
                </option>

                <option value="Potato">
                  🥔 Potato
                </option>

                <option value="Onion">
                  🧅 Onion
                </option>

                <option value="Other">
                  🌿 Other
                </option>
              </select>

            </div>

            <div className="ai-form-group">

              <label htmlFor="description">
                What have you noticed?
                <span>Optional</span>
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="For example: yellow leaves, spots on the leaves, wilting, holes, slow growth..."
                rows="5"
              />

            </div>

          </div>

          {/* ERROR */}
          {error && (
            <div className="ai-error-message">

              <span>⚠️</span>

              <div>

                <strong>
                  Unable to analyze
                </strong>

                <p>
                  {error}
                </p>

              </div>

            </div>
          )}

          {/* ANALYZE */}
          <button
            type="submit"
            className="ai-analyze-button"
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <span className="ai-spinner"></span>
                Analyzing crop...
              </>
            ) : (
              <>
                🤖
                Analyze Crop with AI
                <span>→</span>
              </>
            )}
          </button>

        </form>

      </section>

      {/* RESULTS */}
      {result && (
        <section className="ai-results-section">

          <div className="ai-results-heading">

            <span className="section-label">
              AI ANALYSIS COMPLETE
            </span>

            <h2>
              Your crop assessment
            </h2>

            <p>
              Here is what AgroBaz AI observed from
              the supplied image.
            </p>

          </div>

          <div className="ai-results-grid">

            {/* MAIN RESULT */}
            <div className="ai-result-card ai-main-result">

              <div className="ai-result-icon">
                🔬
              </div>

              <span className="ai-result-label">
                POSSIBLE CONDITION
              </span>

              <h3>
                {result.possibleCondition ||
                  "Unable to determine"}
              </h3>

              <div className="ai-result-crop">
                Crop:{" "}
                <strong>
                  {result.crop || crop}
                </strong>
              </div>

              {result.confidence && (
                <div className="ai-confidence">

                  <span>
                    Confidence
                  </span>

                  <strong>
                    {result.confidence}
                  </strong>

                </div>
              )}

            </div>

            {/* SYMPTOMS */}
            <div className="ai-result-card">

              <div className="ai-result-card-title">
                <span>👀</span>

                <h3>
                  Symptoms observed
                </h3>
              </div>

              {Array.isArray(
                result.symptomsObserved
              ) &&
              result.symptomsObserved.length > 0 ? (
                <ul className="ai-result-list">

                  {result.symptomsObserved.map(
                    (symptom, index) => (
                      <li key={index}>
                        <span>✓</span>
                        {symptom}
                      </li>
                    )
                  )}

                </ul>
              ) : (
                <p className="ai-no-result">
                  No specific symptoms could be
                  confidently identified.
                </p>
              )}

            </div>

            {/* ACTIONS */}
            <div className="ai-result-card">

              <div className="ai-result-card-title">
                <span>🌱</span>

                <h3>
                  Recommended actions
                </h3>
              </div>

              {Array.isArray(
                result.recommendedActions
              ) &&
              result.recommendedActions.length > 0 ? (
                <ul className="ai-result-list">

                  {result.recommendedActions.map(
                    (action, index) => (
                      <li key={index}>
                        <span>→</span>
                        {action}
                      </li>
                    )
                  )}

                </ul>
              ) : (
                <p className="ai-no-result">
                  No specific actions were returned.
                </p>
              )}

            </div>

            {/* PREVENTION */}
            <div className="ai-result-card">

              <div className="ai-result-card-title">
                <span>🛡️</span>

                <h3>
                  Prevention
                </h3>
              </div>

              {Array.isArray(
                result.prevention
              ) &&
              result.prevention.length > 0 ? (
                <ul className="ai-result-list">

                  {result.prevention.map(
                    (item, index) => (
                      <li key={index}>
                        <span>✓</span>
                        {item}
                      </li>
                    )
                  )}

                </ul>
              ) : (
                <p className="ai-no-result">
                  No prevention recommendations
                  were returned.
                </p>
              )}

            </div>

          </div>

          {/* EXPERT WARNING */}
          {result.needsExpertConfirmation && (
            <div className="ai-expert-warning">

              <span>👨‍🌾</span>

              <div>

                <strong>
                  Expert confirmation recommended
                </strong>

                <p>
                  The image alone may not be enough
                  to confidently identify the problem.
                  Consider showing the crop to a local
                  agricultural extension officer or
                  qualified agronomist.
                </p>

              </div>

            </div>
          )}

          {/* DISCLAIMER */}
          <div className="ai-disclaimer">

            <span>ℹ️</span>

            <p>
              <strong>Important:</strong>{" "}
              AgroBaz AI provides an image-based
              agricultural assessment, not a guaranteed
              diagnosis. Crop problems can have similar
              symptoms, so use the result as guidance
              and follow local agricultural advice and
              product labels when taking action.
            </p>

          </div>

          {/* NEW ANALYSIS */}
          <button
            type="button"
            className="ai-new-analysis-button"
            onClick={handleNewAnalysis}
          >
            🔄 Analyze another crop
          </button>

        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="ai-how-section">

        <div className="ai-doctor-section-heading centered">

          <span className="section-label">
            HOW IT WORKS
          </span>

          <h2>
            Crop health analysis in three steps
          </h2>

          <p>
            AgroBaz AI makes it easier to get
            preliminary crop health information.
          </p>

        </div>

        <div className="ai-how-grid">

          <div className="ai-how-card">

            <div className="ai-how-number">
              01
            </div>

            <div className="ai-how-icon">
              📷
            </div>

            <h3>
              Upload
            </h3>

            <p>
              Take a clear photo of the affected
              part of your crop and upload it.
            </p>

          </div>

          <div className="ai-how-card">

            <div className="ai-how-number">
              02
            </div>

            <div className="ai-how-icon">
              🤖
            </div>

            <h3>
              Analyze
            </h3>

            <p>
              AgroBaz AI examines visible patterns
              and symptoms in the image.
            </p>

          </div>

          <div className="ai-how-card">

            <div className="ai-how-number">
              03
            </div>

            <div className="ai-how-icon">
              🌱
            </div>

            <h3>
              Take action
            </h3>

            <p>
              Receive practical guidance and
              prevention suggestions.
            </p>

          </div>

        </div>

      </section>

      {/* MARKETPLACE */}
      <section className="ai-bottom-cta">

        <div>

          <span className="section-label">
            AGROBAZ MARKET
          </span>

          <h2>
            Need farming products?
          </h2>

          <p>
            Explore agricultural products from
            sellers on AgroBaz.
          </p>

        </div>

        <Link
          to="/marketplace"
          className="ai-marketplace-button"
        >
          Explore Marketplace →
        </Link>

      </section>

    </div>
  );
}

export default AIDoctor;
