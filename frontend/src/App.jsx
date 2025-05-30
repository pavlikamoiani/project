import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import * as XLSX from 'xlsx';

// components
import AddCallerModal from './assets/components/AddCallerModal';
import AddCompanyModal from './assets/components/AddCompanyModal';
import FilterForm from './assets/components/FilterForm';
import Sidebar from './assets/components/Sidebar';
import Header from './assets/components/Header';
import ButtonsPanel from './assets/components/ButtonsPanel';
import DataTable from './assets/components/DataTable';
import defaultInstance from './api/defaultInstance';
import AdminDashboard from './assets/components/AdminDashboard';

// ConfirmModal component
function ConfirmModal({ open, onCancel, onConfirm, text }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '12px',
          minWidth: '340px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ marginBottom: '1.7rem', fontSize: '1.13rem', color: '#222' }}>
          {text}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem' }}>
          <button
            onClick={onConfirm}
            style={{
              background: '#d9534f',
              color: '#fff',
              border: 'none',
              padding: '0.55rem 1.4rem',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '1rem'
            }}
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            style={{
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              padding: '0.55rem 1.4rem',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '1rem'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function App({ dashboardType = 'company' }) {
  const [showCallerModal, setShowCallerModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  // eslint-disable-next-line 
  const [companyDetails, setCompanyDetails] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  // eslint-disable-next-line 
  const [importedCompanies, setImportedCompanies] = useState([]);
  const [companyExcelData, setCompanyExcelData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    if (dashboardType === 'company') {
      defaultInstance
        .get('/company-excel-uploads')
        .then((response) => {
          const data = response.data.data || [];
          setCompanies(data);
          setFilteredCompanies(data);
          setCompanyExcelData([]);
        })
        .catch((error) => {
          console.error('Error loading companies:', error);
        });
    }
  }, [dashboardType]);

  useEffect(() => {
    if (dashboardType === 'caller') {
      defaultInstance
        .get(`${import.meta.env.VITE_API_BASE_URL}/get-imported-companies`)
        .then((response) => {
          console.log('Server response:', response.data);
          const normalizedData = response.data.data.map((item) => ({
            id: item.id || Date.now() + Math.random(),
            companyName: item.company_name || item.companyName || '',
            identificationCode: item.identification_code || item.identificationCode || '',
            contactPerson1: item.contact_person1 || item.contactPerson1 || '',
            tel1: item.tel1 || item.contactTel1 || '',
            contactPerson2: item.contact_person2 || item.contactPerson2 || '',
            tel2: item.tel2 || item.contactTel2 || '',
            contactPerson3: item.contact_person3 || item.contactPerson3 || '',
            tel3: item.tel3 || item.contactTel3 || '',
            callerName: item.caller_name || item.callerName || '',
            callerNumber: item.caller_number || item.callerNumber || '',
            receiverNumber: item.receiver_number || item.receiverNumber || '',
            callCount: item.call_count || item.callCount || 0,
            callDate: item.call_date || item.callDate || '',
            callDuration: item.call_duration || item.callDuration || '',
            callStatus: item.call_status || item.callStatus || '',
          }));
          setCompanyDetails(normalizedData);
          setExcelData(normalizedData);
        })
        .catch((error) => {
          console.error('Error loading calls:', error);
        });
    }
  }, [dashboardType]);

  // Handle upload success for company dashboard
  const handleCompanyUploadSuccess = async (data) => {
    const normalizedData = data.map((item, index) => ({
      id: `preview-${index}`, // Добавляем временный id для previewData
      tenderNumber: item.tenderNumber || '',
      buyer: item.buyer || '',
      contact1: item.contact1 || '',
      phone1: item.phone1 || '',
      contact2: item.contact2 || '',
      phone2: item.phone2 || '',
      email: item.email || '',
      executor: item.executor || '',
      idCode: item.idCode || '',
      contractValue: item.contractValue || '',
      totalValueGorgia: item.totalValueGorgia || '',
      lastPurchaseDateGorgia: item.lastPurchaseDateGorgia || '',
      contractEndDate: item.contractEndDate || '',
      foundationDate: item.foundationDate || '',
      manager: item.manager || '',
      status: item.status || '',
    }));
    setPreviewData(normalizedData); 
    try {
      await defaultInstance.post('/company-excel-uploads', { data: normalizedData });
      // Reload from DB after save
      const response = await defaultInstance.get('/company-excel-uploads');
      const dbData = response.data.data || [];
      setCompanies(dbData);
      setFilteredCompanies(dbData);
      setCompanyExcelData([]);
      setPreviewData([]); 
    } catch (err) {
      alert('Failed to save data: ' + (err?.response?.data?.error || err.message));
    }
  };

  // Edit company (inline or modal)
  const handleEdit = async (item) => {
    setEditingItem(item);
    setEditMode(true);
    setShowCompanyModal(true);
  };

  // Save edited company
  const handleSaveEdit = async (updatedData) => {
    try {
      await defaultInstance.put(`/company-excel-uploads/${editingItem.id}`, updatedData);
      const response = await defaultInstance.get('/company-excel-uploads');
      const dbData = response.data.data || [];
      setCompanies(dbData);
      setFilteredCompanies(dbData);
      setShowCompanyModal(false);
      setEditMode(false);
      setEditingItem(null);
      alert('Company updated!');
    } catch (err) {
      alert('Failed to update company: ' + (err?.response?.data?.error || err.message));
    }
  };

  // Open delete confirmation modal
  const handleDeleteCompany = (id) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  // Confirm deletion
  const confirmDeleteCompany = async () => {
    try {
      await defaultInstance.delete(`/company-excel-uploads/${deleteTargetId}`);
      const response = await defaultInstance.get('/company-excel-uploads');
      const dbData = response.data.data || [];
      setCompanies(dbData);
      setFilteredCompanies(dbData);
    } catch (error) {
      alert('Error deleting company: ' + (error?.response?.data?.error || error.message));
    } finally {
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  // Cancel deletion
  const cancelDeleteCompany = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  // Download Excel for Company Dashboard
  const handleDownloadExcel = async () => {
    try {
      // Always fetch the latest data from the backend for download
      const response = await defaultInstance.get('/company-excel-uploads');
      const dbData = response.data.data || [];
      if (!dbData.length) {
        alert('No data to download');
        return;
      }

      // Normalize keys for export
      const exportRows = dbData.map(row => ({
        tenderNumber: row.tenderNumber ?? row.tender_number ?? '',
        buyer: row.buyer ?? '',
        contact1: row.contact1 ?? '',
        phone1: row.phone1 ?? '',
        contact2: row.contact2 ?? '',
        phone2: row.phone2 ?? '',
        email: row.email ?? '',
        executor: row.executor ?? '',
        idCode: row.idCode ?? row.id_code ?? '',
        contractValue: row.contractValue ?? row.contract_value ?? '',
        totalValueGorgia: row.totalValueGorgia ?? row.total_value_gorgia ?? '',
        lastPurchaseDateGorgia: row.lastPurchaseDateGorgia ?? row.last_purchase_date_gorgia ?? '',
        contractEndDate: row.contractEndDate ?? row.contract_end_date ?? '',
        foundationDate: row.foundationDate ?? row.foundation_date ?? '',
        manager: row.manager ?? '',
        status: row.status ?? '',
      }));

      // Define headers and order
      const headers = [
        'ტენდერის N',
        'შემსყიდველი',
        'საკ. პირი #1',
        'ტელ #1',
        'საკ. პირი #2',
        'ტელ #2',
        'ელ-ფოსტა',
        'შემსრულებელი',
        'ს/კ -ID',
        'ხელშ. ღირებ.',
        'გორგიაში შესყ. ჯამურ. ღირ',
        'გორგიაში ბოლო შესყ. თარ.',
        'დაკონტ. საორ. თარიღი',
        'დაფუძ. თარიღი',
        'მენეჯერი',
        'სტატუსი',
      ];

      const keys = [
        'tenderNumber',
        'buyer',
        'contact1',
        'phone1',
        'contact2',
        'phone2',
        'email',
        'executor',
        'idCode',
        'contractValue',
        'totalValueGorgia',
        'lastPurchaseDateGorgia',
        'contractEndDate',
        'foundationDate',
        'manager',
        'status',
      ];

      // Prepare data for export
      const exportData = exportRows.map(row => keys.map(k => row[k] || ''));
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
      worksheet['!cols'] = headers.map((h, i) => ({
        wch: Math.max(
          h.length,
          ...exportData.map(row => (row[i] ? row[i].toString().length : 0))
        ) + 2,
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;
      const fileName = `company_data_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      alert('Error downloading file: ' + (err?.message || 'Unknown error'));
    }
  };

  // Render AdminDashboard if dashboardType is 'admin'
  if (dashboardType === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="dashboard-main-wrapper">
      <Sidebar activeDashboard={dashboardType} setActiveDashboard={() => {}} />
      <div className="dashboard-wrapper">
        <div className="dashboard-ecommerce">
          <div className="container-fluid dashboard-content">
            <div className="row">
              <div className="col-12">
                <Header activeDashboard={dashboardType} />
                <ButtonsPanel
                  activeDashboard={dashboardType}
                  handleOpenModal={() => setShowCompanyModal(true)}
                  handleDownloadExcel={handleDownloadExcel}
                  filteredCompanies={filteredCompanies}
                  setShowFilters={setShowFilters}
                  showFilters={showFilters}
                  onUploadSuccess={() => {}} // Placeholder for caller dashboard
                  excelData={excelData}
                  onCompanyUploadSuccess={handleCompanyUploadSuccess}
                  companyExcelData={companyExcelData}
                  setCompanyExcelData={setCompanyExcelData}
                />
                {showCallerModal && (
                  <AddCallerModal
                    onClose={() => setShowCallerModal(false)}
                    editingItem={editingItem}
                    editMode={editMode}
                  />
                )}
                {showCompanyModal && (
                  <AddCompanyModal
                    onClose={() => setShowCompanyModal(false)}
                    editingItem={editingItem}
                    editMode={editMode}
                    onSave={handleSaveEdit}
                  />
                )}
                {dashboardType === 'company' && (
                  <FilterForm
                    data={companies}
                    onFilterApply={setFilteredCompanies}
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onlyForm={true}
                    dashboardType="company"
                  />
                )}
                {dashboardType === 'caller' && (
                  <DataTable
                    activeDashboard={dashboardType}
                    excelData={excelData}
                    filteredCompanies={filteredCompanies}
                    handleDeleteCompany={handleDeleteCompany}
                    handleEdit={handleEdit}
                    importedCompanies={importedCompanies}
                    companyExcelData={companyExcelData}
                  />
                )}
                {dashboardType === 'company' && (
                  <DataTable
                    activeDashboard={dashboardType}
                    excelData={[]}
                    filteredCompanies={filteredCompanies}
                    previewData={previewData} // Передаем previewData
                    handleDeleteCompany={handleDeleteCompany}
                    handleEdit={handleEdit}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Outlet />
      <ConfirmModal
        open={showDeleteModal}
        onCancel={cancelDeleteCompany}
        onConfirm={confirmDeleteCompany}
        text="Are you sure you want to delete this company?"
      />
    </div>
  );
}

export default App;