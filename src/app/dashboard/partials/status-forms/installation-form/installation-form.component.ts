import { WorkerService } from '../../../worker/worker.service';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormValidationService } from '../../../../helpers/service/form-validation.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import { upload_file_size } from '../../../../helpers/constant/upload-file-size';
import { ProjectService } from '../../../project/service/project.service';
import { DashboardService } from '../../../dashboard.service';

@Component({
  selector: 'app-installation-form',
  templateUrl: './installation-form.component.html',
  styleUrl: './installation-form.component.css',
})
export class InstallationFormComponent implements OnInit, OnChanges {
  @Input() isRefreshDataInput!: number;
  @Input() isApproveBtnShow!: boolean;

  FormGroupData!: FormGroup;
  uploadFileSize: string = `${upload_file_size} MB`;
  installationFileToUpload: File | null = null;
  installationStatus = [
    {
      status: 1,
      statusName: 'Unloading',
      isStarted: true,
      completed: 0,
    },
    {
      status: 2,
      statusName: 'Caracus Assembly',
      isStarted: false,
      completed: 0,
    },
    {
      status: 3,
      statusName: 'Accessories Installation',
      isStarted: false,
      completed: 0,
    },
    {
      status: 4,
      statusName: 'Shutter Fitting',
      isStarted: false,
      completed: 0,
    },
    {
      status: 5,
      statusName: 'Cleaning',
      isStarted: false,
      completed: 0,
    },
  ];

  clientSignature = {
    status: 6,
    statusName: 'Client Signature',
    isStarted: false,
    completed: false,
  };

  WagesAdded = [
    {
      empId: '',
      totalHour: 0,
    },
  ];

  furnitureData: any[] = [];
  workers: any = [];
  installationFileArray: any[] = [];
  dayWorkNoteArray: any[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private _FormValidationService: FormValidationService,
    private _ProjectService: ProjectService,
    private _WorkerService: WorkerService,
    private _DashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.FormGroupData = this.formBuilder.group({
      file: [''],
      dayWorkNote: [''],
      inCharge: ['', [Validators.required]],
      serviceAfter: ['', [Validators.required]],
      foodExpense: ['', [Validators.required]],
      travelExpense: ['', [Validators.required]],
      accomodationExpense: ['', [Validators.required]],
    });

    // Get the Workers list section
    this._WorkerService.getWorkerList().subscribe((res) => {
      this.workers = res.data;
    });

    // Take the Project Data
    const { id } = this.route.snapshot.queryParams;
    this._ProjectService.getProjectById(id).subscribe((res) => {
      const { installationData, furnitureList, attachments } = res.data;

      if (furnitureList.length) {
        this.furnitureData = furnitureList || [];
      }

      if (installationData) {
        this.FormGroupData.patchValue({
          inCharge: installationData.inCharge,
          serviceAfter: installationData.serviceAfter,
          foodExpense: installationData.extraExpense.food,
          travelExpense: installationData.extraExpense.travel,
          accomodationExpense: installationData.extraExpense.accomodation,
        });

        this.dayWorkNoteArray = installationData.dayWorkNote;

        for (let i = 1; i <= this.installationStatus.length; i++) {
          this.installationStatus[i - 1].completed =
            installationData.installationStatus[i].percentCompleted || 0;
          this.installationStatus[i - 1].isStarted =
            installationData.installationStatus[i].isStarted;

          if (i === 1) {
            this.installationStatus[0].isStarted = true;
          }
        }

        this.clientSignature.isStarted =
          installationData.installationStatus['5'].isStarted;

        this.clientSignature.completed =
          installationData.installationStatus['5'].percentCompleted === 100
            ? true
            : false;

        const savedWages: any[] = [];

        installationData.workersData.forEach((el: any) => {
          savedWages.push({
            empId: el.workerId,
            totalHour: el.hours,
          });
        });

        if (savedWages.length) this.WagesAdded = savedWages;

        // Add the Files to preview
        this.installationFileArray = attachments.installationFile;
      }
    });
  }

  ngOnChanges(changes: any): void {
    if (changes.isRefreshDataInput) {
      this.ngOnInit();
    }
  }

  // Validate File size on Add file
  validateFileSize(event: Event) {
    // Check the File size more the 5mb and if true
    const { files } = event.target as HTMLInputElement;

    if (files) {
      // Check the is File
      if (!this._FormValidationService.isValidImagePdfFileType(files)) {
        this.FormGroupData.patchValue({
          file: '',
        });

        this.FormGroupData.controls['file'].setErrors({
          invalidFile: true,
        });

        return;
      }

      // Check the File size
      const maxSize = upload_file_size * 1024 * 1024; // 5MB in bytes
      const selectFile = files[0];

      if (selectFile?.size > maxSize) {
        this.FormGroupData.patchValue({
          file: '',
        });

        this.FormGroupData.controls['file'].setErrors({
          maxSize: true,
        });
        return;
      }

      this.installationFileToUpload = files[0];
    }
  }

  // Change the range option and change the starter
  onChangeTheRange(event: any, status: number) {
    const { value } = event.target;
    let isValid = true;

    if (status > 1) {
      for (let i = status - 2; i >= 0; i--) {
        if (
          !this.installationStatus[i].isStarted ||
          this.installationStatus[i].completed === 0 ||
          this.installationStatus[i].completed < value
        ) {
          if (this.installationStatus[i].completed < value) {
            this.installationStatus[status - 1].completed =
              this.installationStatus[i].completed;
            if (this.installationStatus[status - 1].completed > 0) {
              this.installationStatus[status].isStarted = true;
            }
          }
          isValid = false;
          this.toastr.warning('Not a valid range', 'Warning');
          break;
        }
      }
    }

    if (status === 5 && this.installationStatus[4].completed) {
      this.clientSignature.isStarted = true;
    }

    // Check Others are Completed
    if (isValid) {
      this.installationStatus[status].isStarted = true;

      if (
        this.installationStatus[status].isStarted &&
        this.installationStatus[status].completed > 0
      ) {
        this.installationStatus[status + 1].isStarted = true;
      }
    }
  }

  // Remove the data from the Selected array
  removeWages(index: number) {
    if (this.WagesAdded.length > 1) {
      this.WagesAdded.splice(index, 1);
    }
  }

  // Check the Values are fully Valid
  validateTheSelectedMaterial() {
    let isValid = true;

    this.WagesAdded.forEach((el) => {
      if (!el.empId || el.totalHour < 1) {
        isValid = false;
      }
    });

    return isValid;
  }

  // Add the Wages to the selected array
  addWagesSection() {
    if (this.validateTheSelectedMaterial()) {
      this.WagesAdded.push({
        empId: '',
        totalHour: 0,
      });
    } else {
      this.toastr.error('Please Fill the Wages table completly ..!', 'Error');
    }
  }

  formSubmit(type: string) {
    // Check the form validation is complete
    if (this.FormGroupData.invalid) {
      this.FormGroupData.markAllAsTouched();
      return;
    }

    if (type === 'APPROVE') {
      let isAllStatusComplete = true;

      this.installationStatus.forEach((el) => {
        if (el.completed < 100) {
          isAllStatusComplete = false;
        }
      });

      if (!this.clientSignature.completed) {
        isAllStatusComplete = false;
      }

      if (!isAllStatusComplete) {
        this.toastr.error('Fill all production 100%', 'Error');
        return;
      }
    }

    // Validate the Employee Wages Added Section
    let isAllWagesValid = true;

    for (let i = 0; i < this.WagesAdded.length; i++) {
      if (!this.WagesAdded[i].empId || this.WagesAdded[i].totalHour < 0) {
        isAllWagesValid = false;
        break;
      }
    }

    if (!isAllWagesValid) {
      this.toastr.error('Fill all Wages Input Section', 'Error');
      return;
    }

    const {
      dayWorkNote,
      inCharge,
      serviceAfter,
      foodExpense,
      travelExpense,
      accomodationExpense,
    } = this.FormGroupData.controls;

    const object: any = {
      isApproved: type === 'SUBMIT' ? false : true,
      inCharge: inCharge.value,
      serviceAfter: serviceAfter.value,
      installationStatus: null,
      dayWorkNote: dayWorkNote.value,
      workersData: [],
      furnitureList: [],
      extraExpense: {
        food: foodExpense.value,
        travel: travelExpense.value,
        accomodation: accomodationExpense.value,
      },
    };

    this.WagesAdded.forEach((el) => {
      object.workersData.push({
        workerId: el.empId,
        hours: el.totalHour,
      });
    });

    // Set furniture data
    const resultFurniture: any = [];

    this.furnitureData.forEach((el) => {
      resultFurniture.push({ text: el.text, isInstalled: el.isInstalled });
    });

    // Set installtion Status
    const installationStatus: any = {};

    this.installationStatus.forEach((el) => {
      installationStatus[el.status] = {
        percentCompleted: el.completed,
        isStarted: el.isStarted,
      };
    });

    installationStatus[this.clientSignature.status] = {
      percentCompleted: this.clientSignature.completed ? 100 : 0,
      isStarted: this.clientSignature.isStarted,
    };

    object.installationStatus = installationStatus;
    object.furnitureList = resultFurniture;

    // Take the Project ID form the query params
    const { id } = this.route.snapshot.queryParams;

    // File Upload Section
    if (
      !this.installationFileToUpload &&
      this.installationFileArray.length === 0
    ) {
      this.toastr.error('File is required', 'Error');

      return;
    }

    this._DashboardService.isLoading(true);

    const formObjectFile = new FormData();

    if (this.installationFileToUpload) {
      formObjectFile.append('file', this.installationFileToUpload);
      formObjectFile.append('key', 'installation');

      this._ProjectService.projectFileUpload(formObjectFile, id).subscribe({
        next: (res) => {},
        error: (err) => {
          this.toastr.error(err.error.message, 'Error');
        },
      });
    }

    // Send the APi for change the Status or submit
    this._ProjectService.approveStatusInstallation(object, id).subscribe({
      next: () => {
        this.toastr.success('Successfully update project status', 'Success');
        this.FormGroupData.patchValue({
          file: '',
        });
        this.installationFileToUpload = null;
        this._DashboardService.isLoading(false, false);
        this._ProjectService.$ProjectNavigateDataTransfer.emit();
      },
      error: (err) => {
        this._DashboardService.isLoading(false, false);
        this.toastr.error(err.error.message, 'Error');
      },
    });
  }
}
