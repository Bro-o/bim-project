from django.urls import path
from . import views

urlpatterns = [
    path('excel-to-ids/', views.excel_to_ids, name='excel_to_ids'),
    path('download/template/', views.download_template, name='download_template'),
    path('download/manual/', views.download_manual, name='download_manual'),
    path('ids-to-blender-addon/', views.ids_to_blender_addon, name='ids_to_blender_addon'),
    path('ifc-ids-review/', views.ifc_ids_review, name='ifc_ids_review'),
    path('task-status/<str:task_id>/', views.task_status, name='task_status'),
    path('download-result/<str:task_id>/', views.download_result, name='download_result'),
]
