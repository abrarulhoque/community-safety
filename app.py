import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    current_user,
    logout_user,
    login_required,
)
from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    PasswordField,
    BooleanField,
    SubmitField,
    SelectField,
    TextAreaField,
    DateTimeLocalField,
    FloatField,
    HiddenField,
)
from wtforms.validators import (
    DataRequired,
    Length,
    Email,
    EqualTo,
    ValidationError,
    Optional,
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid
from dotenv import load_dotenv
import json

# Load environment variables from .env file
load_dotenv()

# --- App Initialization ---
app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", os.urandom(24).hex())

# --- Database Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
# Use environment variable for DB URI, fallback to SQLite
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL"
) or "sqlite:///" + os.path.join(basedir, "community_safety.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # Disable modification tracking

# --- Initialize Extensions ---
db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)  # Initialize login manager
login_manager.login_view = (
    "login_page"  # Redirect to login page if user tries to access protected page
)
login_manager.login_message_category = "info"  # Bootstrap class for flash message

# --- Google Maps API Key ---
GOOGLE_MAPS_API_KEY = os.environ.get(
    "GOOGLE_MAPS_API_KEY", "AIzaSyDIEHdGjOOxc7ppIUT73h9vJfqftyONO40"
)


# --- Models ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone_number = db.Column(db.String(20), nullable=True)
    address = db.Column(db.String(200), nullable=True)
    password_hash = db.Column(
        db.String(256), nullable=False
    )  # Increased length for hash
    account_type = db.Column(
        db.String(50), nullable=False, default="Resident"
    )  # e.g., Resident, Leader, LawEnforcement
    registered_on = db.Column(db.DateTime, default=datetime.utcnow)
    # Relationships
    incidents = db.relationship("Incident", backref="reporter", lazy="dynamic")
    cameras = db.relationship("Camera", backref="owner", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"


class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    incident_id_str = db.Column(
        db.String(20), unique=True, nullable=False, index=True
    )  # e.g., LI-23-0078
    location_address = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=True)  # For map integration later
    longitude = db.Column(db.Float, nullable=True)
    incident_type = db.Column(db.String(100), nullable=False)
    incident_datetime = db.Column(db.DateTime, nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(
        db.String(50), nullable=False, default="New"
    )  # New, In Progress, Resolved
    reported_by_user_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=True
    )  # Nullable if reported anonymously
    reported_on = db.Column(db.DateTime, default=datetime.utcnow)
    # Add fields for photos/videos later if needed (e.g., store filenames/paths)

    def __repr__(self):
        return f"<Incident {self.incident_id_str}>"


class Camera(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    camera_name = db.Column(db.String(100), nullable=True)
    camera_type = db.Column(db.String(100), nullable=False)
    camera_brand = db.Column(db.String(100), nullable=True)
    recording_type = db.Column(db.String(100), nullable=True)
    coverage_description = db.Column(db.Text, nullable=True)
    retention_period = db.Column(db.String(50), nullable=True)
    contact_preference = db.Column(db.String(100), nullable=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    registered_on = db.Column(db.DateTime, default=datetime.utcnow)
    verified_on = db.Column(db.DateTime, nullable=True)
    verified_by = db.Column(
        db.String(100), nullable=True
    )  # Store verifier info/ID later

    def __repr__(self):
        return f"<Camera {self.id} at {self.address}>"


# --- User Loader for Flask-Login ---
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# --- Forms ---
class RegistrationForm(FlaskForm):
    account_type = SelectField(
        "Account Type",
        choices=[
            ("Resident", "Resident"),
            ("Community Safety Leader", "Community Safety Leader"),
            ("Law Enforcement", "Law Enforcement"),
        ],
        validators=[DataRequired()],
    )
    first_name = StringField(
        "First Name", validators=[DataRequired(), Length(min=2, max=80)]
    )
    last_name = StringField(
        "Last Name", validators=[DataRequired(), Length(min=2, max=80)]
    )
    email = StringField("Email Address", validators=[DataRequired(), Email()])
    phone_number = StringField(
        "Phone Number (Optional)", validators=[Optional(), Length(max=20)]
    )
    address = StringField(
        "Address (Optional)", validators=[Optional(), Length(max=200)]
    )
    password = PasswordField("Password", validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField(
        "Confirm Password",
        validators=[
            DataRequired(),
            EqualTo("password", message="Passwords must match."),
        ],
    )
    agree_terms = BooleanField(
        "I agree to the Terms of Service and Privacy Policy",
        validators=[DataRequired()],
    )
    submit = SubmitField("Register")

    # Custom validator to check if email already exists
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError(
                "That email is already taken. Please choose a different one."
            )


class LoginForm(FlaskForm):
    email = StringField("Email Address", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[DataRequired()])
    remember = BooleanField("Remember Me")
    submit = SubmitField("Log In")


class ReportIncidentForm(FlaskForm):
    # Step 1 Fields (Location might be handled via JS/Map API in a real app)
    location_address = StringField("Address or Location", validators=[DataRequired()])
    incident_latitude = HiddenField("Latitude")
    incident_longitude = HiddenField("Longitude")

    # Step 2 Fields
    incident_type = SelectField(
        "Incident Type",
        choices=[
            ("", "Select Incident Type"),
            ("Theft", "Theft"),
            ("Suspicious Activity", "Suspicious Activity"),
            ("Vandalism", "Vandalism"),
            ("Assault", "Assault"),
            ("Break-in", "Break-in"),
            ("Other", "Other"),
        ],
        validators=[DataRequired()],
    )
    incident_datetime = DateTimeLocalField(
        "Date and Time", format="%Y-%m-%dT%H:%M", validators=[DataRequired()]
    )
    description = TextAreaField(
        "Description", validators=[DataRequired(), Length(min=10)]
    )
    # File uploads need special handling (Flask-WTF/HTML5) - basic field for now
    # photos_videos = FileField('Photos/Videos (Optional)', validators=[Optional()]) # Requires more setup
    reporter_name = StringField(
        "Your Name", validators=[DataRequired()]
    )  # Pre-fill if logged in
    reporter_contact = StringField(
        "Email Address", validators=[DataRequired(), Email()]
    )  # Pre-fill if logged in
    privacy_check = BooleanField(
        "I understand this report will be shared...", validators=[DataRequired()]
    )

    submit = SubmitField("Submit Report")  # This might be the final step button


class CameraRegistrationForm(FlaskForm):
    address = StringField("Address", validators=[DataRequired()])
    camera_latitude = HiddenField("Latitude")
    camera_longitude = HiddenField("Longitude")
    camera_name = StringField(
        "Camera Name (e.g., Front Door Camera)",
        validators=[Optional(), Length(max=100)],
    )
    camera_type = SelectField(
        "Camera Type",
        choices=[
            ("", "Select camera type"),
            ("Doorbell Camera", "Doorbell Camera"),
            ("Outdoor Security Camera", "Outdoor Security Camera"),
            ("Indoor Security Camera", "Indoor Security Camera"),
            ("Flood Light Camera", "Flood Light Camera"),
            ("Other", "Other"),
        ],
        validators=[DataRequired()],
    )
    camera_brand = SelectField(
        "Camera Brand",
        choices=[
            ("", "Select brand"),
            ("Ring", "Ring"),
            ("Nest", "Nest"),
            ("Arlo", "Arlo"),
            ("Wyze", "Wyze"),
            ("Eufy", "Eufy"),
            ("Blink", "Blink"),
            ("Other", "Other"),
        ],
        validators=[DataRequired()],
    )
    recording_type = SelectField(
        "Recording Type",
        choices=[
            ("", "Select recording type"),
            ("24/7 Continuous", "24/7 Continuous"),
            ("Motion Activated", "Motion Activated"),
            ("Scheduled", "Scheduled"),
            ("Other", "Other"),
        ],
        validators=[DataRequired()],
    )
    coverage_description = TextAreaField(
        "Coverage Area Description (e.g., Front yard and street view)",
        validators=[Optional()],
    )
    retention_period = SelectField(
        "Footage Retention Period",
        choices=[
            ("", "Select retention period"),
            ("24 Hours", "24 Hours"),
            ("3 Days", "3 Days"),
            ("7 Days", "7 Days"),
            ("14 Days", "14 Days"),
            ("30 Days", "30 Days"),
            ("60+ Days", "60+ Days"),
        ],
        validators=[DataRequired()],
    )
    alt_contact = StringField(
        "Alternative Contact Method (Optional - Phone)", validators=[Optional()]
    )
    contact_preference = SelectField(
        "Preferred Contact Hours",
        choices=[
            ("", "Select preferred hours"),
            ("Anytime", "Anytime"),
            ("Morning (8am-12pm)", "Morning (8am-12pm)"),
            ("Afternoon (12pm-5pm)", "Afternoon (12pm-5pm)"),
            ("Evening (5pm-9pm)", "Evening (5pm-9pm)"),
            ("Business Hours Only", "Business Hours Only"),
        ],
        validators=[Optional()],
    )
    terms_check = BooleanField(
        "I understand my camera info will be shared...", validators=[DataRequired()]
    )
    footage_check = BooleanField(
        "I agree to be contacted for footage...", validators=[DataRequired()]
    )
    privacy_check = BooleanField(
        "I agree to the Privacy Policy and Terms of Service",
        validators=[DataRequired()],
    )
    owner_name = StringField("Owner Name", validators=[DataRequired()])
    contact_email = StringField("Owner Email", validators=[DataRequired(), Email()])
    submit = SubmitField("Register Camera")


# --- Context Processor for Year and Google Maps API Key ---
@app.context_processor
def inject_now():
    return {"now": datetime.utcnow(), "google_maps_api_key": GOOGLE_MAPS_API_KEY}


# --- Routes ---
@app.route("/")
def home():
    # Renders the main landing page
    return render_template("index.html", page_title="Community Safety - Home")


@app.route("/login", methods=["GET", "POST"])
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for("home"))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember.data)
            flash("Login successful!", "success")
            # Redirect to intended page or dashboard
            next_page = request.args.get("next")
            return redirect(next_page) if next_page else redirect(url_for("dashboard"))
        else:
            flash("Login Unsuccessful. Please check email and password.", "danger")
    return render_template(
        "login.html", form=form, page_title="Login - Community Safety"
    )


@app.route("/logout")
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("home"))


@app.route("/register", methods=["GET", "POST"])
def register_page():
    if current_user.is_authenticated:
        return redirect(url_for("home"))
    form = RegistrationForm()

    # Pre-fill role if passed in URL
    if request.method == "GET":
        role = request.args.get("role")
        if role in ["Resident", "Community Safety Leader", "Law Enforcement"]:
            form.account_type.data = role

    if form.validate_on_submit():
        user = User(
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            email=form.email.data,
            phone_number=form.phone_number.data,
            address=form.address.data,
            account_type=form.account_type.data,
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash(
            f"Account created for {form.first_name.data}! You can now log in.",
            "success",
        )
        return redirect(url_for("login_page"))
    return render_template(
        "register.html", form=form, page_title="Register - Community Safety"
    )


@app.route("/dashboard")
@login_required
def dashboard():
    # Fetch recent incidents (example: last 5)
    recent_incidents = (
        Incident.query.filter_by(status="New")
        .order_by(Incident.reported_on.desc())
        .limit(5)
        .all()
    )
    # Fetch user's cameras
    user_cameras = (
        Camera.query.filter_by(owner_id=current_user.id)
        .order_by(Camera.registered_on.desc())
        .all()
    )

    # Prepare incident data for map
    incidents_json = json.dumps(
        [
            {
                "id": incident.id,
                "lat": incident.latitude,
                "lng": incident.longitude,
                "type": incident.incident_type,
                "description": incident.description,
                "date": incident.incident_datetime.strftime("%b %d, %Y"),
                "status": incident.status,
            }
            for incident in recent_incidents
            if incident.latitude is not None and incident.longitude is not None
        ]
    )

    # Pass data to the template
    return render_template(
        "dashboard.html",
        page_title="Dashboard - Community Safety",
        user=current_user,
        incidents=recent_incidents,
        cameras=user_cameras,
        incidents_json=incidents_json,
    )


@app.route("/report-incident", methods=["GET", "POST"])
@login_required
def report_incident_page():
    form = ReportIncidentForm()
    # Pre-fill reporter info if possible
    if request.method == "GET":
        form.reporter_name.data = f"{current_user.first_name} {current_user.last_name}"
        form.reporter_contact.data = current_user.email

    if form.validate_on_submit():
        # Generate a unique incident ID
        incident_id_str = (
            f"CS-{datetime.utcnow().strftime('%y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        )

        new_incident = Incident(
            incident_id_str=incident_id_str,
            location_address=form.location_address.data,
            latitude=form.incident_latitude.data,
            longitude=form.incident_longitude.data,
            incident_type=form.incident_type.data,
            incident_datetime=form.incident_datetime.data,
            description=form.description.data,
            reported_by_user_id=current_user.id,
            status="New",  # Initial status
        )
        db.session.add(new_incident)
        db.session.commit()
        flash(f"Incident {incident_id_str} reported successfully!", "success")
        return redirect(url_for("dashboard"))

    return render_template(
        "report-incident.html",
        form=form,
        page_title="Report Incident - Community Safety",
    )


@app.route("/camera-register", methods=["GET", "POST"])
@login_required
def camera_register_page():
    form = CameraRegistrationForm()
    # Pre-fill owner info if possible on GET
    if request.method == "GET":
        form.address.data = current_user.address  # Pre-fill address if available
        form.owner_name.data = current_user.first_name + " " + current_user.last_name
        form.contact_email.data = current_user.email

    if form.validate_on_submit():
        # Safely convert latitude/longitude strings to float or None
        lat_raw = form.camera_latitude.data
        lng_raw = form.camera_longitude.data
        try:
            lat_value = float(lat_raw) if lat_raw not in (None, "", "null") else None
        except ValueError:
            lat_value = None
        try:
            lng_value = float(lng_raw) if lng_raw not in (None, "", "null") else None
        except ValueError:
            lng_value = None

        new_camera = Camera(
            owner_id=current_user.id,
            address=form.address.data,
            latitude=lat_value,
            longitude=lng_value,
            camera_name=form.camera_name.data,
            camera_type=form.camera_type.data,
            camera_brand=form.camera_brand.data,
            recording_type=form.recording_type.data,
            coverage_description=form.coverage_description.data,
            retention_period=form.retention_period.data,
            contact_preference=(
                form.contact_preference.data if form.contact_preference.data else None
            ),
            is_verified=False,  # Default to not verified
        )
        db.session.add(new_camera)
        db.session.commit()
        flash(
            "Camera registration submitted successfully! It will be reviewed by a safety leader.",
            "success",
        )
        return redirect(url_for("dashboard"))
    return render_template(
        "camera-register.html",
        form=form,
        page_title="Register Camera - Community Safety",
    )


@app.route("/profile")
@login_required
def profile_page():
    # Pass the user object
    return render_template(
        "profile.html", page_title="My Profile - Community Safety", user=current_user
    )


# Add routes for privacy policy and terms if they are separate HTML files
@app.route("/privacy")
def privacy_policy():
    return render_template(
        "privacy.html", page_title="Privacy Policy - Community Safety"
    )


@app.route("/terms")
def terms_service():
    return render_template(
        "terms.html", page_title="Terms of Service - Community Safety"
    )


@app.route("/incidents")  # Placeholder for View All Incidents
@login_required
def view_all_incidents():
    flash("Incident list page coming soon!", "info")
    return redirect(url_for("dashboard"))


@app.route("/incident/<int:incident_id>")  # Placeholder for Incident Detail
@login_required
def incident_detail(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    # Basic check if user should see this (e.g., reporter or leader)
    if incident.reported_by_user_id != current_user.id:  # Simplistic check
        flash("You do not have permission to view this incident detail yet.", "warning")
        return redirect(url_for("dashboard"))
    # return render_template('incident_detail.html', incident=incident) # Create this template later
    flash(f"Incident detail page for {incident.incident_id_str} coming soon!", "info")
    return redirect(url_for("dashboard"))


@app.route("/camera/<int:camera_id>")  # Placeholder for Camera Detail/Manage
@login_required
def camera_detail(camera_id):
    camera = Camera.query.get_or_404(camera_id)
    if camera.owner_id != current_user.id:
        flash("You do not have permission to manage this camera.", "warning")
        return redirect(url_for("dashboard"))
    # return render_template('camera_detail.html', camera=camera) # Create this template later
    flash(f"Camera management page for camera {camera.id} coming soon!", "info")
    return redirect(url_for("dashboard"))


# --- Main Execution ---
if __name__ == "__main__":
    # Run the app in debug mode (convenient for development)
    app.run(debug=True)
