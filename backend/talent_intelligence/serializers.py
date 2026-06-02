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
    name = serializers.CharField(max_length=200)
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    yoe = serializers.CharField(max_length=50, required=False, allow_blank=True, default='?')
    location = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    edu = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    skills = serializers.CharField(required=False, allow_blank=True, default='not specified')
    summary = serializers.CharField(required=False, allow_blank=True, default='')
    signals = serializers.CharField(required=False, allow_blank=True, default='')

    def to_representation(self, instance):
        # Translate MongoDB document keys if necessary (specifically stringifying _id)
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
