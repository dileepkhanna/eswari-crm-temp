from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.db import transaction, IntegrityError
from django.utils import timezone
from decimal import Decimal

from .models import CapitalCustomer, CapitalLead, CapitalTask, CapitalLoan, CapitalService
from .serializers import CapitalCustomerSerializer, CapitalLeadSerializer, CapitalTaskSerializer, CapitalLoanSerializer, CapitalServiceSerializer
from accounts.permissions import CompanyAccessPermission


CAPITAL_CODE = 'ESWARI_CAP'


def get_capital_company(user):
    """Get the Eswari Capital company object."""
    from accounts.models import Company
    return Company.objects.filter(code=CAPITAL_CODE).first()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def capital_company_info(request):
    """Return the Eswari Capital company info + role-scoped assignable employees."""
    company = get_capital_company(request.user)
    if not company:
        return Response({'error': 'Capital company not configured'}, status=status.HTTP_404_NOT_FOUND)

    from accounts.models import User
    user = request.user

    # Build the list of users this person can assign to
    if user.is_superuser or user.role == 'admin':
        # Admin sees everyone in the Capital company
        qs = User.objects.filter(company=company, role__in=['employee', 'manager', 'admin'], is_active=True)
    elif user.role == 'manager':
        # Manager sees themselves + their direct reports
        qs = User.objects.filter(
            Q(id=user.id) | Q(manager=user, company=company, is_active=True)
        )
    else:
        # Employee sees only themselves
        qs = User.objects.filter(id=user.id)

    employees = qs.values('id', 'first_name', 'last_name', 'username', 'role')

    return Response({
        'id': company.id,
        'name': company.name,
        'code': company.code,
        'current_user_id': user.id,
        'current_user_role': user.role,
        'employees': [
            {
                'id': u['id'],
                'name': f"{u['first_name']} {u['last_name']}".strip() or u['username'],
                'role': u['role'],
            }
            for u in employees
        ],
    })


def get_capital_queryset(qs, user):
    """Scope queryset to Eswari Capital and apply role-based filtering."""
    from accounts.models import Company
    company = Company.objects.filter(code=CAPITAL_CODE).first()
    if not company:
        return qs.none()

    qs = qs.filter(company=company)

    if user.is_superuser or user.role == 'admin':
        return qs
    if user.role in ['hr']:
        return qs
    if user.role == 'manager':
        employee_ids = list(
            user.__class__.objects.filter(manager=user, is_active=True).values_list('id', flat=True)
        )
        employee_ids.append(user.id)
        return qs.filter(
            Q(assigned_to__id__in=employee_ids) | Q(created_by__id__in=employee_ids)
        ).distinct()
    if user.role == 'employee':
        # Employees see records assigned to them OR created by them
        return qs.filter(
            Q(assigned_to=user) | Q(created_by=user)
        ).distinct()

    return qs.none()


class StandardPagination(PageNumberPagination):
    page_size = 100  # Default 100 rows per page for fast loading
    page_size_query_param = 'page_size'
    max_page_size = 2000  # Maximum allowed


class CapitalCustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CapitalCustomerSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['call_status', 'assigned_to', 'is_converted']
    search_fields = ['name', 'phone', 'email', 'company_name', 'notes']
    ordering_fields = ['created_at', 'name', 'call_status']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_capital_queryset(
            CapitalCustomer.objects.select_related('assigned_to', 'created_by', 'company'),
            self.request.user
        )

    def perform_create(self, serializer):
        company = get_capital_company(self.request.user)
        serializer.save(created_by=self.request.user, company=company)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {'error': 'A customer with this phone number already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def convert_to_lead(self, request, pk=None):
        customer = self.get_object()
        if customer.is_converted:
            return Response({'error': 'Already converted'}, status=status.HTTP_400_BAD_REQUEST)

        # Use get_or_create to handle duplicate phone gracefully
        lead, created = CapitalLead.objects.get_or_create(
            phone=customer.phone,
            company=customer.company,
            defaults=dict(
                name=customer.name or '',
                email=customer.email or '',
                status='new',
                source='customer_conversion',
                assigned_to=customer.assigned_to,
                created_by=request.user,
            ),
        )
        # If lead already existed, still mark customer as converted to it
        customer.is_converted = True
        customer.converted_lead_id = str(lead.id)
        customer.save()
        return Response(CapitalLeadSerializer(lead).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        rows = request.data.get('customers', [])
        if not rows:
            return Response({'error': 'No data'}, status=status.HTTP_400_BAD_REQUEST)
        company = get_capital_company(request.user)
        if not company:
            return Response({'error': 'Capital company not found'}, status=status.HTTP_400_BAD_REQUEST)
        to_create = []
        for row in rows:
            to_create.append(CapitalCustomer(
                name=row.get('name', ''),
                phone=row.get('phone', ''),
                email=row.get('email') or None,
                company_name=row.get('company_name', ''),
                call_status=row.get('call_status', 'pending'),
                notes=row.get('notes', ''),
                company=company,
                created_by=request.user,
            ))
        with transaction.atomic():
            created = CapitalCustomer.objects.bulk_create(to_create, batch_size=200, ignore_conflicts=True)
        return Response({'imported': len(created)}, status=status.HTTP_201_CREATED)


class CapitalLeadViewSet(viewsets.ModelViewSet):
    serializer_class = CapitalLeadSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source', 'assigned_to']
    search_fields = ['name', 'phone', 'email', 'address', 'description']
    ordering_fields = ['created_at', 'name', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_capital_queryset(
            CapitalLead.objects.select_related('assigned_to', 'created_by', 'company'),
            self.request.user
        )

    def perform_create(self, serializer):
        company = get_capital_company(self.request.user)
        serializer.save(created_by=self.request.user, company=company)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        rows = request.data.get('leads', [])
        if not rows:
            return Response({'error': 'No data'}, status=status.HTTP_400_BAD_REQUEST)
        company = get_capital_company(request.user)
        if not company:
            return Response({'error': 'Capital company not found'}, status=status.HTTP_400_BAD_REQUEST)
        to_create = []
        for row in rows:
            to_create.append(CapitalLead(
                name=row.get('name', ''),
                phone=row.get('phone', ''),
                email=row.get('email', ''),
                address=row.get('address', ''),
                status=row.get('status', 'new'),
                source=row.get('source', 'website'),
                description=row.get('description', ''),
                company=company,
                created_by=request.user,
            ))
        with transaction.atomic():
            created = CapitalLead.objects.bulk_create(to_create, batch_size=200, ignore_conflicts=True)
        return Response({'imported': len(created)}, status=status.HTTP_201_CREATED)


class CapitalTaskViewSet(viewsets.ModelViewSet):
    serializer_class = CapitalTaskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'assigned_to']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_capital_queryset(
            CapitalTask.objects.select_related('assigned_to', 'created_by', 'company', 'loan', 'service'),
            self.request.user
        )

    def perform_create(self, serializer):
        company = get_capital_company(self.request.user)
        serializer.save(created_by=self.request.user, company=company)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        rows = request.data.get('tasks', [])
        if not rows:
            return Response({'error': 'No data'}, status=status.HTTP_400_BAD_REQUEST)
        company = get_capital_company(request.user)
        if not company:
            return Response({'error': 'Capital company not found'}, status=status.HTTP_400_BAD_REQUEST)
        to_create = []
        for row in rows:
            to_create.append(CapitalTask(
                title=row.get('title', ''),
                description=row.get('description', ''),
                status=row.get('status', 'in_progress'),
                priority=row.get('priority', 'medium'),
                company=company,
                created_by=request.user,
            ))
        with transaction.atomic():
            created = CapitalTask.objects.bulk_create(to_create, batch_size=200)
        return Response({'imported': len(created)}, status=status.HTTP_201_CREATED)


class CapitalLoanViewSet(viewsets.ModelViewSet):
    serializer_class = CapitalLoanSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'loan_type', 'assigned_to']
    search_fields = ['applicant_name', 'phone', 'email', 'bank_name']
    ordering_fields = ['created_at', 'loan_amount', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_capital_queryset(
            CapitalLoan.objects.select_related('assigned_to', 'created_by', 'company').only(
                'id', 'applicant_name', 'phone', 'email', 'address', 'loan_type',
                'loan_amount', 'tenure_months', 'interest_rate', 'bank_name', 'status',
                'notes', 'created_at', 'updated_at',
                'assigned_to__id', 'assigned_to__first_name', 'assigned_to__last_name', 'assigned_to__username',
                'created_by__id', 'created_by__first_name', 'created_by__last_name', 'created_by__username',
                'company__id'
            ),
            self.request.user
        )

    def perform_create(self, serializer):
        company = get_capital_company(self.request.user)
        serializer.save(created_by=self.request.user, company=company)

    def get_serializer_context(self):
        """Add company to serializer context for validation"""
        context = super().get_serializer_context()
        context['company'] = get_capital_company(self.request.user)
        return context

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {'error': 'A loan of this type already exists for this phone number.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        rows = request.data.get('loans', [])
        if not rows:
            return Response({'error': 'No data'}, status=status.HTTP_400_BAD_REQUEST)
        company = get_capital_company(request.user)
        if not company:
            return Response({'error': 'Capital company not found'}, status=status.HTTP_400_BAD_REQUEST)
        to_create = []
        for row in rows:
            to_create.append(CapitalLoan(
                applicant_name=row.get('applicant_name', ''),
                phone=row.get('phone', ''),
                email=row.get('email') or None,
                loan_type=row.get('loan_type', 'personal'),
                loan_amount=row.get('loan_amount') or None,
                tenure_months=row.get('tenure_months') or None,
                bank_name=row.get('bank_name', ''),
                status=row.get('status', 'inquiry'),
                notes=row.get('notes', ''),
                company=company,
                created_by=request.user,
            ))
        with transaction.atomic():
            created = CapitalLoan.objects.bulk_create(to_create, batch_size=200)
        return Response({'imported': len(created)}, status=status.HTTP_201_CREATED)


class CapitalServiceViewSet(viewsets.ModelViewSet):
    serializer_class = CapitalServiceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'service_type', 'assigned_to']
    search_fields = ['client_name', 'phone', 'email', 'business_name', 'pan_number', 'gstin']
    ordering_fields = ['created_at', 'status', 'service_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_capital_queryset(
            CapitalService.objects.select_related('assigned_to', 'created_by', 'company').only(
                'id', 'client_name', 'phone', 'email', 'business_name', 'service_type',
                'status', 'financial_year', 'business_type', 'turnover_range', 'income_slab',
                'pan_number', 'gstin', 'notes', 'created_at', 'updated_at',
                'assigned_to__id', 'assigned_to__first_name', 'assigned_to__last_name', 'assigned_to__username',
                'created_by__id', 'created_by__first_name', 'created_by__last_name', 'created_by__username',
                'company__id'
            ),
            self.request.user
        )

    def perform_create(self, serializer):
        company = get_capital_company(self.request.user)
        serializer.save(created_by=self.request.user, company=company)

    def get_serializer_context(self):
        """Add company to serializer context for validation"""
        context = super().get_serializer_context()
        context['company'] = get_capital_company(self.request.user)
        return context

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {'error': 'A record for this service type and financial year already exists for this phone number.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        rows = request.data.get('services', [])
        if not rows:
            return Response({'error': 'No data'}, status=status.HTTP_400_BAD_REQUEST)
        company = get_capital_company(request.user)
        if not company:
            return Response({'error': 'Capital company not found'}, status=status.HTTP_400_BAD_REQUEST)
        to_create = []
        for row in rows:
            to_create.append(CapitalService(
                client_name=row.get('client_name', ''),
                phone=row.get('phone', ''),
                email=row.get('email') or None,
                pan_number=row.get('pan_number', ''),
                business_name=row.get('business_name', ''),
                service_type=row.get('service_type', 'gst_registration'),
                financial_year=row.get('financial_year', ''),
                status=row.get('status', 'inquiry'),
                notes=row.get('notes', ''),
                company=company,
                created_by=request.user,
            ))
        with transaction.atomic():
            created = CapitalService.objects.bulk_create(to_create, batch_size=200)
        return Response({'imported': len(created)}, status=status.HTTP_201_CREATED)



# Advanced Features ViewSets

from .models import LoanDocument, LoanApprovalStage, BankInterestRate, BankLoanStatus
from .serializers import (
    LoanDocumentSerializer, LoanApprovalStageSerializer,
    BankInterestRateSerializer, BankLoanStatusSerializer, CapitalLoanDetailSerializer
)


class LoanDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = LoanDocumentSerializer
    permission_classes = [CompanyAccessPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['loan', 'document_type', 'status']
    ordering_fields = ['document_type', 'created_at']
    ordering = ['document_type']
    
    def get_queryset(self):
        user = self.request.user
        base_queryset = LoanDocument.objects.select_related('loan', 'verified_by')
        return get_capital_queryset(base_queryset, user)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark document as verified"""
        document = self.get_object()
        document.status = 'verified'
        document.verified_by = request.user
        document.verified_at = timezone.now()
        document.save()
        serializer = self.get_serializer(document)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Mark document as rejected"""
        document = self.get_object()
        document.status = 'rejected'
        document.notes = request.data.get('notes', document.notes)
        document.save()
        serializer = self.get_serializer(document)
        return Response(serializer.data)


class LoanApprovalStageViewSet(viewsets.ModelViewSet):
    serializer_class = LoanApprovalStageSerializer
    permission_classes = [CompanyAccessPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['loan', 'stage', 'status', 'assigned_to']
    ordering_fields = ['created_at', 'stage']
    ordering = ['created_at']
    
    def get_queryset(self):
        user = self.request.user
        base_queryset = LoanApprovalStage.objects.select_related('loan', 'assigned_to', 'completed_by')
        return get_capital_queryset(base_queryset, user)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark stage as completed"""
        stage = self.get_object()
        stage.status = 'completed'
        stage.completed_by = request.user
        stage.completed_at = timezone.now()
        stage.notes = request.data.get('notes', stage.notes)
        stage.save()
        serializer = self.get_serializer(stage)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Mark stage as rejected"""
        stage = self.get_object()
        stage.status = 'rejected'
        stage.notes = request.data.get('notes', stage.notes)
        stage.save()
        serializer = self.get_serializer(stage)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def initialize_workflow(self, request):
        """Initialize all approval stages for a loan"""
        loan_id = request.data.get('loan_id')
        if not loan_id:
            return Response({'error': 'loan_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            loan = CapitalLoan.objects.get(id=loan_id)
        except CapitalLoan.DoesNotExist:
            return Response({'error': 'Loan not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create all stages
        stages = []
        for stage_choice, _ in LoanApprovalStage.STAGE_CHOICES:
            stage, created = LoanApprovalStage.objects.get_or_create(
                loan=loan,
                stage=stage_choice,
                defaults={'assigned_to': loan.assigned_to}
            )
            stages.append(stage)
        
        serializer = self.get_serializer(stages, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BankInterestRateViewSet(viewsets.ModelViewSet):
    serializer_class = BankInterestRateSerializer
    permission_classes = [CompanyAccessPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['bank_name', 'loan_type', 'is_active']
    ordering_fields = ['bank_name', 'min_interest_rate', 'created_at']
    ordering = ['bank_name', 'loan_type']
    
    def get_queryset(self):
        user = self.request.user
        company = get_capital_company(user)
        return BankInterestRate.objects.filter(company=company)
    
    def perform_create(self, serializer):
        company = get_capital_company(self.request.user)
        serializer.save(company=company)
    
    @action(detail=False, methods=['post'])
    def calculate_emi(self, request):
        """Calculate EMI for given parameters"""
        principal = Decimal(request.data.get('principal', 0))
        annual_rate = Decimal(request.data.get('annual_rate', 0))
        tenure_months = int(request.data.get('tenure_months', 0))
        
        if principal <= 0 or tenure_months <= 0:
            return Response({'error': 'Invalid parameters'}, status=status.HTTP_400_BAD_REQUEST)
        
        emi = BankInterestRate.calculate_emi(principal, annual_rate, tenure_months)
        total_payment = BankInterestRate.calculate_total_payment(emi, tenure_months)
        total_interest = BankInterestRate.calculate_total_interest(total_payment, principal)
        
        return Response({
            'principal': float(principal),
            'annual_rate': float(annual_rate),
            'tenure_months': tenure_months,
            'monthly_emi': float(emi),
            'total_payment': float(total_payment),
            'total_interest': float(total_interest),
        })
    
    @action(detail=False, methods=['get'])
    def compare_rates(self, request):
        """Compare interest rates across banks for a loan type"""
        loan_type = request.query_params.get('loan_type')
        loan_amount = Decimal(request.query_params.get('loan_amount', 0))
        
        if not loan_type:
            return Response({'error': 'loan_type is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(loan_type=loan_type, is_active=True)
        
        if loan_amount > 0:
            queryset = queryset.filter(
                min_loan_amount__lte=loan_amount,
                max_loan_amount__gte=loan_amount
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class BankLoanStatusViewSet(viewsets.ModelViewSet):
    serializer_class = BankLoanStatusSerializer
    permission_classes = [CompanyAccessPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['loan', 'bank_name', 'status']
    ordering_fields = ['updated_at', 'submitted_date']
    ordering = ['-updated_at']
    
    def get_queryset(self):
        user = self.request.user
        base_queryset = BankLoanStatus.objects.select_related('loan', 'last_updated_by')
        return get_capital_queryset(base_queryset, user)
    
    def perform_create(self, serializer):
        serializer.save(last_updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(last_updated_by=self.request.user)
