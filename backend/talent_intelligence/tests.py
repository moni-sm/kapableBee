from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock


class TalentIntelligenceAPITests(APITestCase):

    def setUp(self):
        # Create a test recruiter user
        self.username = "test_recruiter"
        self.password = "securepassword123"
        self.email = "test@recruiter.com"
        self.user = User.objects.create_user(
            username=self.username,
            password=self.password,
            email=self.email
        )
        
        # Authenticate and obtain JWT token
        response = self.client.post(reverse('token_obtain_pair'), {
            'username': self.username,
            'password': self.password
        })
        self.access_token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_user_registration(self):
        url = reverse('register')
        data = {
            'username': 'new_recruiter',
            'password': 'anotherpassword',
            'email': 'new@recruiter.com'
        }
        # Clear client authorization header to simulate anonymous guest registration
        self.client.credentials()
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], "User registered successfully")

    @patch('talent_intelligence.views.candidates_collection')
    def test_candidates_list(self, mock_collection):
        # Mock MongoDB query response
        mock_cand = {
            '_id': '60d5ec4b1234567890abcdef',
            'name': 'Test Candidate',
            'title': 'Engineer',
            'yoe': '5',
            'skills': 'Python',
            'user_id': self.user.id
        }
        mock_collection.find.return_value = [mock_cand]
        
        url = reverse('candidate-list')
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Candidate')

    @patch('talent_intelligence.views.candidates_collection')
    def test_candidate_create(self, mock_collection):
        # Mock MongoDB insert response
        mock_result = MagicMock()
        mock_result.inserted_id = '60d5ec4b1234567890abcdef'
        mock_collection.insert_one.return_value = mock_result
        
        url = reverse('candidate-list')
        data = {
            'name': 'Priya Nair',
            'title': 'Senior ML Engineer',
            'yoe': '6',
            'skills': 'Python, PyTorch'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Priya Nair')

    def test_ranking_api(self):
        url = reverse('rank')
        data = {
            'title': 'ML Engineer',
            'jd': 'Required: Python, PyTorch, model serving, inference optimization.',
            'candidates': [
                {
                    'name': 'Priya Nair',
                    'title': 'Senior ML Engineer',
                    'yoe': '6',
                    'skills': 'Python, PyTorch, model deployment',
                    'summary': 'Built real-time matching ML pipelines at Ola. Kaggle grandmaster.'
                },
                {
                    'name': 'Nikhil Joshi',
                    'title': 'SDE-2, TCS',
                    'yoe': '5',
                    'skills': 'Java, Spring Boot, MySQL',
                    'summary': 'Worked on enterprise banking apps'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Verify that Priya is ranked #1 due to stronger keyword / resume alignment
        self.assertEqual(response.data[0]['name'], 'Priya Nair')
        self.assertEqual(response.data[0]['rank'], 1)
        self.assertTrue(response.data[0]['overall_score'] > response.data[1]['overall_score'])

    @patch('talent_intelligence.views.candidates_collection')
    def test_candidate_bulk_create(self, mock_collection):
        mock_result = MagicMock()
        mock_result.inserted_ids = ['60d5ec4b1234567890abcdef', '60d5ec4b1234567890abcdeg']
        mock_collection.insert_many.return_value = mock_result
        
        url = reverse('candidate-list') + 'bulk/'
        data = [
            {
                'name': 'Priya Nair',
                'title': 'Senior ML Engineer',
                'yoe': '6',
                'skills': 'Python, PyTorch'
            },
            {
                'name': 'Nikhil Joshi',
                'title': 'SDE-2, TCS',
                'yoe': '5',
                'skills': 'Java, Spring Boot'
            }
        ]
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['name'], 'Priya Nair')
        self.assertEqual(response.data[1]['name'], 'Nikhil Joshi')

    @patch('talent_intelligence.views.candidates_collection')
    def test_ranking_api_from_db(self, mock_collection):
        # Mock database collection find results
        mock_collection.find.return_value = [
            {
                '_id': '60d5ec4b1234567890abcdef',
                'name': 'Priya Nair',
                'title': 'Senior ML Engineer',
                'yoe': '6',
                'skills': 'Python, PyTorch, model deployment',
                'summary': 'Built real-time matching ML pipelines at Ola. Kaggle grandmaster.',
                'user_id': self.user.id
            },
            {
                '_id': '60d5ec4b1234567890abcdeg',
                'name': 'Nikhil Joshi',
                'title': 'SDE-2, TCS',
                'yoe': '5',
                'skills': 'Java, Spring Boot, MySQL',
                'summary': 'Worked on enterprise banking apps',
                'user_id': self.user.id
            }
        ]
        
        url = reverse('rank')
        data = {
            'title': 'ML Engineer',
            'jd': 'Required: Python, PyTorch, model serving, inference optimization.'
            # No 'candidates' key sent in payload, should trigger DB lookup
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['name'], 'Priya Nair')
        self.assertEqual(response.data[0]['rank'], 1)
        self.assertTrue(response.data[0]['overall_score'] > response.data[1]['overall_score'])
        # Verify metadata is returned in response
        self.assertEqual(response.data[0]['title'], 'Senior ML Engineer')
        self.assertEqual(response.data[0]['yoe'], '6')
