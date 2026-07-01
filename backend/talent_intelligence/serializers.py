from django.contrib.auth.models import User
from rest_framework import serializers

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user


class CandidateSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, read_only=True)

    # ── Legacy flat fields (kept for backward-compat with older documents) ──
    name     = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    title    = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    yoe      = serializers.CharField(max_length=50,  required=False, allow_blank=True, default='?')
    location = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    edu      = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    summary  = serializers.CharField(required=False, allow_blank=True, default='')
    signals  = serializers.CharField(required=False, allow_blank=True, default='')

    # ── Redrob structured schema ──────────────────────────────────────────────
    # Top-level identifier
    candidate_id = serializers.CharField(max_length=100, required=False, allow_blank=True)

    # profile — nested object with biography / professional meta
    #   expected keys: anonymized_name, headline, summary, location, country,
    #                  years_of_experience, current_title, current_company,
    #                  current_company_size, current_industry
    profile = serializers.JSONField(required=False)

    # career_history — list of job objects
    #   each item: company, title, start_date, end_date, duration_months,
    #              is_current, industry, company_size, description
    career_history = serializers.JSONField(required=False)

    # education — list of education objects
    #   each item: institution, degree, field_of_study, start_year, end_year,
    #              grade, tier
    education = serializers.JSONField(required=False)

    # skills — list of skill objects
    #   each item: name, proficiency, endorsements, duration_months
    skills = serializers.JSONField(required=False)

    # certifications — list of certification objects (may be empty list)
    certifications = serializers.JSONField(required=False)

    # languages — list of language objects
    #   each item: language, proficiency
    languages = serializers.JSONField(required=False)

    # redrob_signals — platform behavioural signals object
    #   keys: profile_completeness_score, signup_date, last_active_date,
    #         open_to_work_flag, profile_views_received_30d,
    #         applications_submitted_30d, recruiter_response_rate,
    #         avg_response_time_hours, skill_assessment_scores (dict),
    #         connection_count, endorsements_received, notice_period_days,
    #         expected_salary_range_inr_lpa (dict: min/max),
    #         preferred_work_mode, willing_to_relocate,
    #         github_activity_score, search_appearance_30d,
    #         saved_by_recruiters_30d, interview_completion_rate,
    #         offer_acceptance_rate, verified_email, verified_phone,
    #         linkedin_connected
    redrob_signals = serializers.JSONField(required=False)

    def to_representation(self, instance):
        """Translate MongoDB _id → id string."""
        ret = super().to_representation(instance)
        if '_id' in instance:
            ret['id'] = str(instance['_id'])
        return ret


class JobSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, read_only=True)
    title = serializers.CharField(max_length=200)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    jd = serializers.CharField()
    priorities = serializers.CharField(required=False, allow_blank=True, default='')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if '_id' in instance:
            ret['id'] = str(instance['_id'])
        return ret
